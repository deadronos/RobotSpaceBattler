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

import { distanceXZ } from "../../../../lib/math/geometry";
import { AStarSearch } from "../search/AStarSearch";
import { NearestAccessiblePoint } from "../search/NearestAccessiblePoint";
import { PathCache } from "../search/PathCache";
import { PathOptimizer } from "../smoothing/PathOptimizer";
import type { NavigationPath, Point2D, Point3D } from "../types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";

interface PathfindingSystemOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number; // ms between recalculations per robot
  frameBudget?: number; // ms budget per frame
  enableTimeout?: boolean; // Enable timeout fallback
  timeoutMs?: number; // Timeout threshold (default: 100ms)
  enableNearestFallback?: boolean; // Enable nearest accessible point fallback
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
  private astar: AStarSearch;
  private optimizer: PathOptimizer;
  private nearestFinder: NearestAccessiblePoint;
  private cache?: PathCache;
  private enableSmoothing: boolean;
  private throttleInterval: number;
  private frameBudget: number;
  private enableTimeout: boolean;
  private timeoutMs: number;
  private enableNearestFallback: boolean;
  private lastCalculationTimes: Map<string, number> = new Map();
  private telemetryCallbacks: PathfindingTelemetryCallback[] = [];

  constructor(
    private navMeshResource: NavMeshResource,
    options?: PathfindingSystemOptions,
  ) {
    this.astar = new AStarSearch(navMeshResource.mesh);
    this.optimizer = new PathOptimizer();
    this.nearestFinder = new NearestAccessiblePoint(navMeshResource.mesh);
    this.enableSmoothing = options?.enableSmoothing ?? true;
    this.throttleInterval = options?.throttleInterval ?? 333; // Default: max 3 per second
    this.frameBudget = options?.frameBudget ?? 2.4; // Default: 2.4ms per frame
    this.enableTimeout = options?.enableTimeout ?? false;
    this.timeoutMs = options?.timeoutMs ?? 100;
    this.enableNearestFallback = options?.enableNearestFallback ?? true;

    if (options?.enableCaching ?? true) {
      this.cache = new PathCache({
        maxSize: options?.maxCacheSize ?? 100,
      });
    }
  }

  /**
   * Register a callback to receive telemetry events
   */
  onTelemetry(callback: PathfindingTelemetryCallback): void {
    this.telemetryCallbacks.push(callback);
  }

  /**
   * Emit a telemetry event to all registered callbacks
   */
  private emitTelemetry(event: PathfindingTelemetryEvent): void {
    for (const callback of this.telemetryCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error("Telemetry callback error:", error);
      }
    }
  }

  /**
   * Calculate path between two positions with caching and throttling
   * @param start - Starting position
   * @param pathComponent - Robot's path component to update (contains target)
   * @param robotId - Optional robot ID for throttling and telemetry
   */
  calculatePath(
    start: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ): void {
    const target = pathComponent.requestedTarget;
    if (!target) {
      return; // No target specified
    }

    // Emit start telemetry
    this.emitTelemetry({
      type: "path-calculation-start",
      entityId: robotId,
      timestamp: Date.now(),
      from: start,
      to: target,
    });

    // Throttle check: max recalculations per robot
    if (robotId) {
      const lastCalc = this.lastCalculationTimes.get(robotId) || 0;
      const now = Date.now();
      if (now - lastCalc < this.throttleInterval) {
        return; // Skip: too soon since last calculation
      }
      this.lastCalculationTimes.set(robotId, now);
    }

    const startTime = performance.now();

    // Check cache first
    let path: NavigationPath | null = null;
    if (this.cache) {
      const cached = this.cache.get(start, target);
      if (cached) {
        path = cached;
        pathComponent.path = path;
        pathComponent.status = "valid";
        pathComponent.lastCalculationTime = Date.now();

        // Record cache hit as calculation (with minimal time)
        const endTime = performance.now();
        const cacheLookupTime = endTime - startTime;
        this.navMeshResource.recordCalculation(cacheLookupTime);

        // Update cache hit rate
        const stats = this.cache.getStats();
        this.navMeshResource.updateCacheHitRate(stats.hitRate);

        // Emit completion telemetry for cache hit
        this.emitTelemetry({
          type: "path-calculation-complete",
          entityId: robotId,
          timestamp: Date.now(),
          success: true,
          durationMs: cacheLookupTime,
          pathLength: path.totalDistance,
          waypointCount: path.waypoints.length,
          fromCache: true,
        });

        return;
      }
    }

    // Convert 3D positions to 2D for pathfinding (project to XZ plane)
    const start2D: Point2D = { x: start.x, z: start.z };
    const target2D: Point2D = { x: target.x, z: target.z };

    // Find path using A*
    let waypoints2D = this.astar.findPath(start2D, target2D);

    // Apply path smoothing if enabled
    if (this.enableSmoothing && waypoints2D && waypoints2D.length > 2) {
      waypoints2D = this.optimizer.smoothPath(waypoints2D);
    }

    const endTime = performance.now();
    const calculationTime = endTime - startTime;

    // Record metrics
    this.navMeshResource.recordCalculation(calculationTime);

    // Convert 2D waypoints to 3D (add Y coordinate)
    if (waypoints2D && waypoints2D.length > 0) {
      const waypoints3D: Point3D[] = waypoints2D.map((wp) => ({
        x: wp.x,
        y: start.y, // Maintain robot's Y position
        z: wp.z,
      }));

      // Calculate path length
      let pathLength = 0;
      for (let i = 1; i < waypoints3D.length; i++) {
        pathLength += distanceXZ(waypoints3D[i], waypoints3D[i - 1]);
      }

      // Create navigation path
      path = {
        waypoints: waypoints3D,
        totalDistance: pathLength,
        smoothed: this.enableSmoothing,
      };

      // Cache the result
      if (this.cache) {
        this.cache.set(start, target, path);
        const stats = this.cache.getStats();
        this.navMeshResource.updateCacheHitRate(stats.hitRate);
      }

      pathComponent.path = path;
      pathComponent.status = "valid";
      pathComponent.lastCalculationTime = Date.now();

      // Emit success telemetry
      this.emitTelemetry({
        type: "path-calculation-complete",
        entityId: robotId,
        timestamp: Date.now(),
        success: true,
        durationMs: calculationTime,
        pathLength: path.totalDistance,
        waypointCount: path.waypoints.length,
        fromCache: false,
      });
    } else {
      // No path found - try nearest accessible point fallback
      if (this.enableNearestFallback) {
        const nearestPoint = this.nearestFinder.findNearest(target, start);

        if (nearestPoint) {
          // Try pathfinding to nearest accessible point
          const nearestTarget2D: Point2D = {
            x: nearestPoint.x,
            z: nearestPoint.z,
          };
          let fallbackWaypoints = this.astar.findPath(start2D, nearestTarget2D);

          if (
            this.enableSmoothing &&
            fallbackWaypoints &&
            fallbackWaypoints.length > 2
          ) {
            fallbackWaypoints = this.optimizer.smoothPath(fallbackWaypoints);
          }

          if (fallbackWaypoints && fallbackWaypoints.length > 0) {
            const waypoints3D: Point3D[] = fallbackWaypoints.map((wp) => ({
              x: wp.x,
              y: start.y,
              z: wp.z,
            }));

            let pathLength = 0;
            for (let i = 1; i < waypoints3D.length; i++) {
              pathLength += distanceXZ(waypoints3D[i], waypoints3D[i - 1]);
            }

            path = {
              waypoints: waypoints3D,
              totalDistance: pathLength,
              smoothed: this.enableSmoothing,
            };

            pathComponent.path = path;
            pathComponent.status = "valid";
            pathComponent.lastCalculationTime = Date.now();

            // Log fallback usage
            console.warn(
              `Pathfinding: No path to target, using nearest accessible point at (${nearestPoint.x.toFixed(1)}, ${nearestPoint.z.toFixed(1)})`,
            );

            // Emit success telemetry for fallback path
            this.emitTelemetry({
              type: "path-calculation-complete",
              entityId: robotId,
              timestamp: Date.now(),
              success: true,
              durationMs: calculationTime,
              pathLength: path.totalDistance,
              waypointCount: path.waypoints.length,
              fromCache: false,
            });

            return;
          }
        }
      }

      // Complete failure - no path found even to nearest point
      pathComponent.path = null;
      pathComponent.status = "failed";
      pathComponent.lastCalculationTime = Date.now();

      console.error(
        `Pathfinding failed: No path from (${start.x.toFixed(1)}, ${start.z.toFixed(1)}) to (${target.x.toFixed(1)}, ${target.z.toFixed(1)})`,
      );

      // Emit failure telemetry
      this.emitTelemetry({
        type: "path-calculation-failed",
        entityId: robotId,
        timestamp: Date.now(),
        success: false,
        durationMs: calculationTime,
        error: "No path found to target or nearest accessible point",
      });
    }
  }

  /**
   * Execute pathfinding for all robots needing recalculation
   * This would be called from the ECS system's execute() method
   */
  execute(
    robotsWithPaths: Array<{
      pathComponent: PathComponent;
      position: Point3D;
      id?: string;
    }>,
  ): void {
    const startTime = performance.now();
    let processed = 0;

    for (const robot of robotsWithPaths) {
      // Check frame budget
      const elapsed = performance.now() - startTime;
      if (elapsed > this.frameBudget) {
        console.warn(
          `PathfindingSystem: Frame budget exceeded, processed ${processed}/${robotsWithPaths.length} robots`,
        );
        break;
      }

      if (
        robot.pathComponent.status === "pending" &&
        robot.pathComponent.requestedTarget
      ) {
        this.calculatePath(robot.position, robot.pathComponent, robot.id);
        processed++;
      }
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Log if execution exceeds budget
    if (executionTime > this.frameBudget) {
      console.warn(
        `PathfindingSystem.execute() took ${executionTime.toFixed(2)}ms (budget: ${this.frameBudget}ms)`,
      );
    }
  }
}
