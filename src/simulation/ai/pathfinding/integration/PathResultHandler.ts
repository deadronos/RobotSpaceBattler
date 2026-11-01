import type { PathCache } from "../search/PathCache";
import type { Point3D } from "../types";
import type { WorkerPathResult } from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";
import type { PathfindingTelemetryCallback } from "./PathfindingTelemetry";

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
 */
export class PathResultHandler {
  constructor(
    private navMeshResource: NavMeshResource,
    private telemetryCallbacks: PathfindingTelemetryCallback[],
    private cache?: PathCache,
    private now: () => number = () => 0,
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
   */
  handleWorkerResult(
    result: WorkerPathResult,
    pendingRequests: Map<string, PendingRequest>,
  ) {
    const request = pendingRequests.get(result.id);
    if (!request) return;

    const { pathComponent, robotId, start, target } = request;
    this.processResult(
      result,
      pathComponent,
      robotId,
      start,
      target,
      pendingRequests,
    );
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
    pathComponent.lastCalculationTime = this.now();

    if (this.cache) {
      this.cache.set(start, target, path);
      const stats = this.cache.getStats();
      this.navMeshResource.updateCacheHitRate(stats.hitRate);
    }

    this.navMeshResource.recordCalculation(result.durationMs);

    this.emitTelemetry({
      type: "path-calculation-complete",
      entityId: robotId,
      timestamp: this.now(),
      success: true,
      durationMs: result.durationMs,
      pathLength: path.totalDistance,
      waypointCount: path.waypoints.length,
      fromCache: false,
    });
  }

  private handleNoPath(
    result: WorkerPathResult,
    pathComponent: PathComponent,
    robotId: string | undefined,
  ) {
    pathComponent.path = null;
    pathComponent.status = "failed" as const;
    pathComponent.lastCalculationTime = this.now();

    this.emitTelemetry({
      type: "path-calculation-failed",
      entityId: robotId,
      timestamp: this.now(),
      success: false,
      durationMs: result.durationMs,
      error: "No path found",
    });
  }

  private handleFailure(
    result: WorkerPathResult,
    pathComponent: PathComponent,
    robotId: string | undefined,
  ) {
    pathComponent.path = null;
    pathComponent.status = "failed" as const;
    pathComponent.lastCalculationTime = this.now();

    this.emitTelemetry({
      type: "path-calculation-failed",
      entityId: robotId,
      timestamp: this.now(),
      success: false,
      durationMs: result.durationMs,
      error: result.error || "Unknown worker error",
    });
  }
}
