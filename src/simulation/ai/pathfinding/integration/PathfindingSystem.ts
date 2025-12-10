/**
 * ECS system for pathfinding operations
 * @module pathfinding/integration
 */

import { AStarSearch } from '../search/AStarSearch';
import { PathCache } from '../search/PathCache';
import { PathOptimizer } from '../smoothing/PathOptimizer';
import type { NavigationPath, Point2D, Point3D } from '../types';
import type { NavMeshResource } from './NavMeshResource';
import type { PathComponent } from './PathComponent';

interface PathfindingSystemOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number; // ms between recalculations per robot
  frameBudget?: number; // ms budget per frame
}

/**
 * ECS system that calculates and manages navigation paths for robots
 * Includes caching, throttling, and frame budget enforcement
 */
export class PathfindingSystem {
  private astar: AStarSearch;
  private optimizer: PathOptimizer;
  private cache?: PathCache;
  private enableSmoothing: boolean;
  private throttleInterval: number;
  private frameBudget: number;
  private lastCalculationTimes: Map<string, number> = new Map();

  constructor(
    private navMeshResource: NavMeshResource,
    options?: PathfindingSystemOptions,
  ) {
    this.astar = new AStarSearch(navMeshResource.mesh);
    this.optimizer = new PathOptimizer();
    this.enableSmoothing = options?.enableSmoothing ?? true;
    this.throttleInterval = options?.throttleInterval ?? 333; // Default: max 3 per second
    this.frameBudget = options?.frameBudget ?? 2.4; // Default: 2.4ms per frame

    if (options?.enableCaching ?? true) {
      this.cache = new PathCache({
        maxSize: options?.maxCacheSize ?? 100,
      });
    }
  }

  /**
   * Calculate path between two positions with caching and throttling
   * @param start - Starting position
   * @param target - Target position
   * @param pathComponent - Robot's path component to update
   * @param robotId - Optional robot ID for throttling
   */
  calculatePath(
    start: Point3D,
    target: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ): void {
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
        pathComponent.status = 'valid';
        pathComponent.lastCalculationTime = Date.now();
        
        // Update cache hit rate
        const stats = this.cache.getStats();
        this.navMeshResource.updateCacheHitRate(stats.hitRate);
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
        const dx = waypoints3D[i].x - waypoints3D[i - 1].x;
        const dz = waypoints3D[i].z - waypoints3D[i - 1].z;
        pathLength += Math.sqrt(dx * dx + dz * dz);
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
      pathComponent.status = 'valid';
      pathComponent.lastCalculationTime = Date.now();
    } else {
      // No path found
      pathComponent.path = null;
      pathComponent.status = 'failed';
      pathComponent.lastCalculationTime = Date.now();
    }
  }

  /**
   * Execute pathfinding for all robots needing recalculation
   * This would be called from the ECS system's execute() method
   */
  execute(robotsWithPaths: Array<{ pathComponent: PathComponent; position: Point3D; id?: string }>): void {
    const startTime = performance.now();
    let processed = 0;

    for (const robot of robotsWithPaths) {
      // Check frame budget
      const elapsed = performance.now() - startTime;
      if (elapsed > this.frameBudget) {
        console.warn(`PathfindingSystem: Frame budget exceeded, processed ${processed}/${robotsWithPaths.length} robots`);
        break;
      }

      if (robot.pathComponent.status === 'pending' && robot.pathComponent.requestedTarget) {
        this.calculatePath(
          robot.position,
          robot.pathComponent.requestedTarget,
          robot.pathComponent,
          robot.id
        );
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
