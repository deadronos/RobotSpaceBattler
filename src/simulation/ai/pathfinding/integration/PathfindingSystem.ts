/**
 * ECS system for pathfinding operations
 * @module pathfinding/integration
 *
 * CONSTITUTION-EXEMPT: 315 LOC (exceeds 300 limit)
 * Justification: Core integration system that manages telemetry, caching, throttling,
 * and path calculation in a cohesive unit. Splitting would create artificial boundaries
 * between tightly coupled concerns (e.g., telemetry emission during calculation, cache
 * coordination with throttling). The file is well-structured with clear method boundaries
 * and remains maintainable at current size.
 */

import type { Point3D } from "../types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";
import { PathCalculator } from "./PathCalculator";
import { PathfindingTelemetry } from "./PathfindingTelemetry";

interface PathfindingSystemOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number; // ms between recalculations per robot
  frameBudget?: number; // ms budget per frame
  enableTimeout?: boolean; // Enable timeout fallback
  timeoutMs?: number; // Timeout threshold (default: 100ms)
  enableNearestFallback?: boolean; // Enable nearest accessible point fallback
  maxWorkers?: number;
}

export interface PathfindingTelemetryEvent {
  type:
    | "path-calculation-start"
    | "path-calculation-complete"
    | "path-calculation-failed";
  entityId?: string;
  timestamp: number;
  from?: Point3D;
  to?: Point3D;
  success?: boolean;
  durationMs?: number;
  pathLength?: number;
  waypointCount?: number;
  fromCache?: boolean;
  error?: string;
}

export type PathfindingTelemetryCallback = (
  event: PathfindingTelemetryEvent,
) => void;

/**
 * ECS system that calculates and manages navigation paths for robots
 * Includes caching, throttling, and frame budget enforcement
 */
export class PathfindingSystem {
  private calculator: PathCalculator;
  private frameBudget: number;
  private telemetry = new PathfindingTelemetry();

  constructor(private navMeshResource: NavMeshResource, options?: PathfindingSystemOptions) {
    this.frameBudget = options?.frameBudget ?? 2.4;
    this.calculator = new PathCalculator(navMeshResource, options);
    // Forward telemetry: keep the system observable
    this.calculator.onTelemetry((e) => this.telemetry.emit(e));

    // Attempt to initialize worker if mesh is present (non-blocking)
    void this.calculator.ensureInitialized();
  }

  onTelemetry(callback: PathfindingTelemetryCallback): void {
    this.telemetry.on(callback);
  }

  /**
   * Backwards-compatible helper: calculate a single path synchronously (returns a Promise)
   */
  calculatePath(start: Point3D, pathComponent: PathComponent, robotId?: string): Promise<void> {
    return this.calculator.calculate(start, pathComponent, robotId);
  }

  execute(
    robotsWithPaths: Array<{
      pathComponent: PathComponent;
      position: Point3D;
      id?: string;
    }>,
  ): void {
    const startTime = performance.now();

    for (const robot of robotsWithPaths) {
      const elapsed = performance.now() - startTime;
      if (elapsed > this.frameBudget) break;

      if ((robot.pathComponent.status === "pending" || robot.pathComponent.status === "failed") && robot.pathComponent.requestedTarget) {
        void this.calculator.calculate(robot.position, robot.pathComponent, robot.id);
      }
    }
  }
}
