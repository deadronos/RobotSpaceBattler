import { move, spawn } from "multithreading";

import type { PathCache } from "../search/PathCache";
import type { Point3D } from "../types";
import { initWorker } from "../worker/pathfinding.worker";
import type { WorkerPathRequest, WorkerPathResult } from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";
import type { PathfindingTelemetryCallback } from "./PathfindingTelemetry";
import type { PathWorkerManager } from "./PathWorkerManager";

export interface PendingRequest {
  pathComponent: PathComponent;
  startTime: number;
  robotId?: string;
  start: Point3D;
  target: Point3D;
}

/**
 * Handles results from pathfinding worker calculations.
 * Processes success/failure states, updates path components, and emits telemetry.
 * Manages worker initialization retry logic.
 */
export class PathResultHandler {
  constructor(
    private workerManager: PathWorkerManager,
    private navMeshResource: NavMeshResource,
    private telemetryCallbacks: PathfindingTelemetryCallback[],
    private cache?: PathCache,
  ) {}

  emitTelemetry(event: Parameters<PathfindingTelemetryCallback>[0]) {
    for (const cb of this.telemetryCallbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error("Telemetry callback error:", err);
      }
    }
  }

  /**
   * Process worker result, handling success, failure, and no-path cases.
   * If worker not initialized, attempts recovery by initializing and retrying.
   */
  async handleWorkerResult(
    result: WorkerPathResult,
    pendingRequests: Map<string, PendingRequest>,
    enableSmoothing: boolean,
    enableNearestFallback: boolean,
  ) {
    console.debug('handleWorkerResult received:', result);
    const request = pendingRequests.get(result.id);
    if (!request) return;

    const { pathComponent, robotId, start, target } = request;

    // If worker not initialized, try to initialize it once and retry
    if (result.status === "failed" && result.error === "Worker not initialized") {
      await this.handleWorkerNotInitialized(
        result,
        request,
        pendingRequests,
        enableSmoothing,
        enableNearestFallback,
      );
      return;
    }

    // Process result normally (success, failure, or no_path)
    this.processResult(result, pathComponent, robotId, start, target, pendingRequests);
  }

  /**
   * Handle the case where worker was not initialized.
   * Attempts to initialize and retry the request once.
   */
  private async handleWorkerNotInitialized(
    result: WorkerPathResult,
    request: PendingRequest,
    pendingRequests: Map<string, PendingRequest>,
    enableSmoothing: boolean,
    enableNearestFallback: boolean,
  ) {
    const { pathComponent, robotId, start, target } = request;

    try {
      // Attempt to initialize worker
      await spawn(move(this.navMeshResource.getSerializedMesh()), initWorker).join();

      // Retry the original request exactly once
      const retryReq: WorkerPathRequest = {
        type: "path_request",
        id: result.id,
        start,
        target,
        enableSmoothing,
        enableNearestFallback,
      };

      const retryRes = await this.workerManager.runWorker(retryReq);
      if (retryRes.ok) {
        const retryResult = await this.workerManager.unwrapWorkerResult(retryRes.value);
        this.processResult(
          retryResult,
          pathComponent,
          robotId,
          start,
          target,
          pendingRequests,
        );
        return;
      }
    } catch {
      // fallthrough to fail handler
    }

    // If retry didn't succeed, mark as failed
    pendingRequests.delete(result.id);
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
  }

  /**
   * Process a normal result (success, no_path, or failure case).
   */
  private processResult(
    result: WorkerPathResult,
    pathComponent: PathComponent,
    robotId: string | undefined,
    start: Point3D,
    target: Point3D,
    pendingRequests: Map<string, PendingRequest>,
  ) {
    pendingRequests.delete(result.id);

    if (result.status === "success" && result.path) {
      this.handleSuccessPath(result, pathComponent, robotId, start, target);
    } else if (result.status === "no_path") {
      this.handleNoPath(result, pathComponent, robotId);
    } else {
      this.handleFailure(result, pathComponent, robotId);
    }
  }

  private handleSuccessPath(
    result: WorkerPathResult,
    pathComponent: PathComponent,
    robotId: string | undefined,
    start: Point3D,
    target: Point3D,
  ) {
    const path = result.path!;
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
  }

  private handleNoPath(result: WorkerPathResult, pathComponent: PathComponent, robotId: string | undefined) {
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
  }

  private handleFailure(result: WorkerPathResult, pathComponent: PathComponent, robotId: string | undefined) {
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
