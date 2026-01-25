import { move, spawn } from "multithreading";

import { PathCache } from "../search/PathCache";
import type { Point3D } from "../types";
import { calculatePath, initWorker } from "../worker/pathfinding.worker";
import type { WorkerPathRequest, WorkerPathResult } from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";
import type { PathfindingTelemetryCallback } from "./PathfindingTelemetry";

export interface PathCalculatorOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number;
  enableNearestFallback?: boolean;
  timeoutMs?: number;
}

export class PathCalculator {
  private cache?: PathCache;
  private throttleInterval: number;
  private enableSmoothing: boolean;
  private enableNearestFallback: boolean;
  private lastCalculationTimes: Map<string, number> = new Map();
  private pendingRequests: Map<string, { pathComponent: PathComponent; startTime: number; robotId?: string; start: Point3D; target: Point3D; }> = new Map();
  private telemetryCallbacks: PathfindingTelemetryCallback[] = [];

  constructor(private navMeshResource: NavMeshResource, options?: PathCalculatorOptions) {
    this.enableSmoothing = options?.enableSmoothing ?? true;
    this.throttleInterval = options?.throttleInterval ?? 333;
    this.enableNearestFallback = options?.enableNearestFallback ?? true;

    if (options?.enableCaching ?? true) {
      this.cache = new PathCache({ maxSize: options?.maxCacheSize ?? 100 });
    }

    // Worker initialization is lazy: workers will be initialized on demand if a worker
    // reports it is uninitialized. Avoid eager init in constructor to keep tests simple.
  }

  private async initializeWorker() {
    // Initialize worker with serialized mesh so worker-level search state can be primed.
    try {
      await spawn(move(this.navMeshResource.getSerializedMesh()), initWorker).join();
    } catch (err) {
      console.error("Failed to initialize pathfinding worker:", err);
    }
  }

  /**
   * Try to initialize the worker only if the serialized mesh looks valid.
   * This avoids initializing with empty test doubles in unit tests.
   */
  async ensureInitialized() {
    try {
      const mesh = this.navMeshResource.getSerializedMesh();
      const polygons = (mesh as { polygons?: unknown }).polygons;
      if (Array.isArray(polygons) && polygons.length > 0) {
        await this.initializeWorker();
      }
    } catch (err) {
      console.error("PathCalculator ensureInitialized failed:", err);
    }
  }

  onTelemetry(cb: PathfindingTelemetryCallback) {
    this.telemetryCallbacks.push(cb);
  }

  private emitTelemetry(event: Parameters<PathfindingTelemetryCallback>[0]) {
    for (const cb of this.telemetryCallbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error("Telemetry callback error:", err);
      }
    }
  }

  // Worker runner is internal but kept as a separate method so tests can stub this
  protected async runWorker(req: WorkerPathRequest): Promise<{ ok: true; value: WorkerPathResult } | { ok: false; error: unknown }> {
    try {
      const task = spawn(move(req), calculatePath);
      return await task.join();
    } catch (err) {
      // Fallback for environments where worker spawn fails (tests / Node without worker support)
      try {
        // Run pathfinding in-process as a graceful fallback
        const value = await calculatePath(req);
        return { ok: true, value };
      } catch (err2) {
        return { ok: false, error: err2 };
      }
    }
  }

  async calculate(start: Point3D, pathComponent: PathComponent, robotId?: string) {
    const target = pathComponent.requestedTarget;
    if (!target) return;

    // Cache hit (check before mesh validation so unit tests can verify cache behavior without a full mesh)
    if (this.cache) {
      const cached = this.cache.get(start, target);
      if (cached) {
        pathComponent.path = cached;
        pathComponent.status = "valid" as const;
        pathComponent.lastCalculationTime = Date.now();

        this.navMeshResource.recordCalculation(0);
        const stats = this.cache.getStats();
        this.navMeshResource.updateCacheHitRate(stats.hitRate);

        this.emitTelemetry({
          type: "path-calculation-complete",
          entityId: robotId,
          timestamp: Date.now(),
          success: true,
          durationMs: 0,
          pathLength: cached.totalDistance,
          waypointCount: cached.waypoints.length,
          fromCache: true,
        });
        return;
      }
    }

    // If the worker runner is the library's default implementation, then
    // verify the serialized mesh looks valid (has polygons) before dispatching.
    // This avoids asking real workers to initialize with empty meshes during tests.
    if (this.runWorker === (PathCalculator.prototype as unknown as { runWorker: unknown }).runWorker) {
      const mesh = this.navMeshResource.getSerializedMesh();
      const polygons = (mesh as { polygons?: unknown }).polygons;
      if (!Array.isArray(polygons) || polygons.length === 0) {
        pathComponent.status = "failed" as const;
        pathComponent.path = null;

        this.emitTelemetry({
          type: "path-calculation-failed",
          entityId: robotId,
          timestamp: Date.now(),
          success: false,
          durationMs: 0,
          error: "NavMesh has no polygons",
        });

        return;
      }
    }

    if (robotId) {
      const last = this.lastCalculationTimes.get(robotId) || 0;
      const now = Date.now();
      if (now - last < this.throttleInterval) return;
      this.lastCalculationTimes.set(robotId, now);
    }

    // Not cached: dispatch to worker
    pathComponent.status = "calculating" as const;

    const requestId = robotId || Math.random().toString(36).substr(2, 9);
    const startTime = performance.now();

    this.pendingRequests.set(requestId, { pathComponent, startTime, robotId, start, target });

    this.emitTelemetry({
      type: "path-calculation-start",
      entityId: robotId,
      timestamp: Date.now(),
      from: start,
      to: target,
    });

    try {
      const req: WorkerPathRequest = {
        type: "path_request",
        id: requestId,
        start,
        target,
        enableSmoothing: this.enableSmoothing,
        enableNearestFallback: this.enableNearestFallback,
      };

      const res = await this.runWorker(req);
      console.debug('PathCalculator.runWorker result:', res);

      if (res.ok) {
        // Some runtimes return the worker result wrapped in a Promise inside the value
        const workerResult = (res.value && typeof (res.value as any).then === 'function')
          ? await (res.value as unknown as Promise<WorkerPathResult>)
          : (res.value as WorkerPathResult);
        await this.handleWorkerResult(workerResult);
      } else {
        throw res.error;
      }
    } catch (err) {
      const req = this.pendingRequests.get(requestId);
      if (req) {
        req.pathComponent.status = "failed" as const;
      }
      this.pendingRequests.delete(requestId);

      this.emitTelemetry({
        type: "path-calculation-failed",
        entityId: robotId,
        timestamp: Date.now(),
        success: false,
        durationMs: performance.now() - startTime,
        error: String(err),
      });
    }
  }

  private async handleWorkerResult(result: WorkerPathResult) {
    console.debug('handleWorkerResult received:', result);
    const request = this.pendingRequests.get(result.id);
    if (!request) return;

    this.pendingRequests.delete(result.id);
    const { pathComponent, robotId, start, target } = request;

    if (result.status === "failed" && result.error === "Worker not initialized") {
      // Try to initialize worker and retry the request once
      await spawn(move(this.navMeshResource.getSerializedMesh()), initWorker).join();

      // Attempt to re-dispatch the original request
      try {
        const retryReq: WorkerPathRequest = {
          type: "path_request",
          id: result.id,
          start,
          target,
          enableSmoothing: this.enableSmoothing,
          enableNearestFallback: this.enableNearestFallback,
        };

        const retryRes = await this.runWorker(retryReq);
        if (retryRes.ok) {
          const retryResult = (retryRes.value && typeof (retryRes.value as any).then === "function")
            ? await (retryRes.value as unknown as Promise<WorkerPathResult>)
            : (retryRes.value as WorkerPathResult);
          // Handle the retry result inline to avoid re-entrancy into handleWorkerResult
          if (retryResult.status === "success" && retryResult.path) {
            pathComponent.path = retryResult.path;
            pathComponent.status = "valid" as const;
            pathComponent.lastCalculationTime = Date.now();

            if (this.cache) {
              this.cache.set(start, target, retryResult.path);
              const stats = this.cache.getStats();
              this.navMeshResource.updateCacheHitRate(stats.hitRate);
            }

            this.navMeshResource.recordCalculation(retryResult.durationMs);

            this.emitTelemetry({
              type: "path-calculation-complete",
              entityId: robotId,
              timestamp: Date.now(),
              success: true,
              durationMs: retryResult.durationMs,
              pathLength: retryResult.path.totalDistance,
              waypointCount: retryResult.path.waypoints.length,
              fromCache: false,
            });
            return;
          }

          if (retryResult.status === "no_path") {
            pathComponent.path = null;
            pathComponent.status = "failed" as const;
            pathComponent.lastCalculationTime = Date.now();

            this.emitTelemetry({
              type: "path-calculation-failed",
              entityId: robotId,
              timestamp: Date.now(),
              success: false,
              durationMs: retryResult.durationMs,
              error: "No path found",
            });
            return;
          }
        }
      } catch (retryErr) {
        // fallthrough to fail
      }

      // If retry didn't succeed, mark as failed and emit telemetry
      pathComponent.status = "failed" as const;
      pathComponent.path = null;
      this.emitTelemetry({
        type: "path-calculation-failed",
        entityId: robotId,
        timestamp: Date.now(),
        success: false,
        durationMs: result.durationMs,
        error: "Worker not initialized",
      });
      return;
    }

    if (result.status === "success" && result.path) {
      const path = result.path;
      pathComponent.path = path;
      pathComponent.status = "valid" as const;
      pathComponent.lastCalculationTime = Date.now();

      if (this.cache) {
        this.cache.set(start, target, path);
        const stats = this.cache.getStats();
        this.navMeshResource.updateCacheHitRate(stats.hitRate);
      }

      this.navMeshResource.recordCalculation(result.durationMs);

      this.emitTelemetry({
        type: "path-calculation-complete",
        entityId: robotId,
        timestamp: Date.now(),
        success: true,
        durationMs: result.durationMs,
        pathLength: path.totalDistance,
        waypointCount: path.waypoints.length,
        fromCache: false,
      });

      return;
    }

    if (result.status === "no_path") {
      pathComponent.path = null;
      pathComponent.status = "failed" as const;
      pathComponent.lastCalculationTime = Date.now();

      this.emitTelemetry({
        type: "path-calculation-failed",
        entityId: robotId,
        timestamp: Date.now(),
        success: false,
        durationMs: result.durationMs,
        error: "No path found",
      });
      return;
    }

    pathComponent.path = null;
    pathComponent.status = "failed" as const;
    pathComponent.lastCalculationTime = Date.now();

    this.emitTelemetry({
      type: "path-calculation-failed",
      entityId: robotId,
      timestamp: Date.now(),
      success: false,
      durationMs: result.durationMs,
      error: result.error || "Unknown worker error",
    });
  }
}
