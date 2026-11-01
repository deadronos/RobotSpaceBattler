import { PathCache } from "../search/PathCache";
import type { Point3D } from "../types";
import type { WorkerPathRequest, WorkerPathResult } from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";
import type { PathfindingTelemetryCallback } from "./PathfindingTelemetry";
import { PathResultHandler, type PendingRequest } from "./PathResultHandler";
import { PathWorkerManager } from "./PathWorkerManager";

export interface PathCalculatorOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number;
  enableNearestFallback?: boolean;
  timeoutMs?: number;
}

/**
 * Orchestrates path calculation requests, managing caching, throttling, and worker execution.
 * Delegates worker management to PathWorkerManager and result handling to PathResultHandler.
 */
export class PathCalculator {
  private cache?: PathCache;
  private throttleInterval: number;
  private enableSmoothing: boolean;
  private enableNearestFallback: boolean;
  private lastCalculationTimes: Map<string, number> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private telemetryCallbacks: PathfindingTelemetryCallback[] = [];
  /** Latest simulation time (ms); the only clock used for throttling/timestamps. */
  private simTimeMs = 0;

  private workerManager: PathWorkerManager;
  private resultHandler: PathResultHandler;

  constructor(
    private navMeshResource: NavMeshResource,
    options?: PathCalculatorOptions,
  ) {
    this.enableSmoothing = options?.enableSmoothing ?? true;
    this.throttleInterval = options?.throttleInterval ?? 333;
    this.enableNearestFallback = options?.enableNearestFallback ?? true;

    if (options?.enableCaching ?? true) {
      this.cache = new PathCache({
        maxSize: options?.maxCacheSize ?? 100,
        now: () => this.simTimeMs,
      });
    }

    // Initialize worker and result handler
    this.workerManager = new PathWorkerManager(navMeshResource);
    this.resultHandler = new PathResultHandler(
      navMeshResource,
      this.telemetryCallbacks,
      this.cache,
      () => this.simTimeMs,
    );

    // Worker initialization is lazy: workers will be initialized on demand if a worker
    // reports it is uninitialized. Avoid eager init in constructor to keep tests simple.
  }

  /**
   * Try to initialize the worker only if the serialized mesh looks valid.
   * This avoids initializing with empty test doubles in unit tests.
   */
  async ensureInitialized() {
    await this.workerManager.ensureInitialized();
  }

  /**
   * Sets the current simulation time. Path requests, throttling, cache LRU
   * ordering and result timestamps all use this clock instead of wall-clock
   * time so the simulation stays deterministic.
   */
  setSimTime(nowMs: number): void {
    this.simTimeMs = nowMs;
  }

  dispose(): void {
    this.workerManager.dispose();
  }

  onTelemetry(cb: PathfindingTelemetryCallback) {
    this.telemetryCallbacks.push(cb);
  }

  /**
   * Worker execution method - kept as a separate method on PathCalculator
   * so tests can stub/monkeypatch this for testing purposes.
   */
  protected async runWorker(
    req: WorkerPathRequest,
  ): Promise<
    { ok: true; value: WorkerPathResult } | { ok: false; error: unknown }
  > {
    return this.workerManager.runWorker(req);
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

  /**
   * Calculate a path from start to the requested target on the pathComponent.
   * Uses caching and request throttling to optimize performance.
   */
  async calculate(
    start: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ) {
    const target = pathComponent.requestedTarget;
    if (!target) return;

    // Check cache first (check before mesh validation so unit tests can verify cache behavior)
    if (this.cache) {
      const cached = this.cache.get(start, target);
      if (cached) {
        pathComponent.path = cached;
        pathComponent.status = "valid" as const;
        pathComponent.lastCalculationTime = this.simTimeMs;

        this.navMeshResource.recordCalculation(0);
        const stats = this.cache.getStats();
        this.navMeshResource.updateCacheHitRate(stats.hitRate);

        this.emitTelemetry({
          type: "path-calculation-complete",
          entityId: robotId,
          timestamp: this.simTimeMs,
          success: true,
          durationMs: 0,
          pathLength: cached.totalDistance,
          waypointCount: cached.waypoints.length,
          fromCache: true,
        });
        return;
      }
    }

    // Validate mesh has polygons before dispatching to worker
    // (Skip this check if runWorker has been monkeypatched for testing)
    if (
      this.runWorker ===
      (PathCalculator.prototype as unknown as { runWorker: unknown }).runWorker
    ) {
      if (!this.workerManager.isValidMesh()) {
        pathComponent.status = "failed" as const;
        pathComponent.path = null;

        this.emitTelemetry({
          type: "path-calculation-failed",
          entityId: robotId,
          timestamp: this.simTimeMs,
          success: false,
          durationMs: 0,
          error: "NavMesh has no polygons",
        });

        return;
      }
    }

    // Apply throttling for repeated requests from same robot
    if (robotId) {
      const last = this.lastCalculationTimes.get(robotId);
      const now = this.simTimeMs;
      if (last !== undefined && now - last < this.throttleInterval) return;
      this.lastCalculationTimes.set(robotId, now);
    }

    // Dispatch to worker
    await this.dispatchWorkerRequest(start, target, pathComponent, robotId);
  }

  private async dispatchWorkerRequest(
    start: Point3D,
    target: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ) {
    pathComponent.status = "calculating" as const;

    const requestId = robotId || Math.random().toString(36).substr(2, 9);
    const startTime = this.simTimeMs;

    this.pendingRequests.set(requestId, {
      pathComponent,
      startTime,
      robotId,
      start,
      target,
    });

    this.emitTelemetry({
      type: "path-calculation-start",
      entityId: robotId,
      timestamp: this.simTimeMs,
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

      if (res.ok) {
        this.resultHandler.handleWorkerResult(res.value, this.pendingRequests);
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
        timestamp: this.simTimeMs,
        success: false,
        durationMs: this.simTimeMs - startTime,
        error: String(err),
      });
    }
  }
}
