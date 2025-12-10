/**
 * ECS system for pathfinding operations
 * @module pathfinding/integration
 */

import { AStarSearch } from '../search/AStarSearch';
import type { NavigationPath, PathStatus, Point2D, Point3D } from '../types';
import type { NavMeshResource } from './NavMeshResource';
import type { PathComponent } from './PathComponent';

/**
 * ECS system that calculates and manages navigation paths for robots
 */
export class PathfindingSystem {
  private astar: AStarSearch;

  constructor(private navMeshResource: NavMeshResource) {
    this.astar = new AStarSearch(navMeshResource.mesh);
  }

  /**
   * Calculate path for a robot with path component
   * @param pathComponent - Robot's path component
   * @param currentPosition - Robot's current 3D position
   */
  calculatePath(pathComponent: PathComponent, currentPosition: Point3D): void {
    // Skip if no recalculation needed
    if (!pathComponent.needsRecalculation || !pathComponent.targetPosition) {
      return;
    }

    const startTime = performance.now();

    // Convert 3D positions to 2D for pathfinding (project to XZ plane)
    const start: Point2D = { x: currentPosition.x, z: currentPosition.z };
    const target: Point2D = {
      x: pathComponent.targetPosition.x,
      z: pathComponent.targetPosition.z,
    };

    // Find path using A*
    const waypoints2D = this.astar.findPath(start, target);

    const endTime = performance.now();
    const calculationTime = endTime - startTime;

    // Update metrics
    this.navMeshResource.metrics.totalPathsCalculated++;
    const currentAvg = this.navMeshResource.metrics.averageCalculationTime;
    const totalPaths = this.navMeshResource.metrics.totalPathsCalculated;
    this.navMeshResource.metrics.averageCalculationTime =
      (currentAvg * (totalPaths - 1) + calculationTime) / totalPaths;

    // Convert 2D waypoints to 3D (add Y coordinate)
    if (waypoints2D && waypoints2D.length > 0) {
      const waypoints3D: Point3D[] = waypoints2D.map((wp) => ({
        x: wp.x,
        y: currentPosition.y, // Maintain robot's Y position
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
      const path: NavigationPath = {
        id: crypto.randomUUID(),
        robotId: 'unknown', // Will be set by caller
        waypoints: waypoints3D,
        currentIndex: 0,
        status: 'active' as PathStatus,
        metadata: {
          generatedAt: Date.now(),
          calculationTime,
          pathLength,
          waypointCount: waypoints3D.length,
        },
      };

      pathComponent.path = path;
      pathComponent.needsRecalculation = false;
      pathComponent.lastCalculatedAt = Date.now();
    } else {
      // No path found
      pathComponent.path = null;
      pathComponent.needsRecalculation = false;
      pathComponent.lastCalculatedAt = Date.now();
    }
  }

  /**
   * Execute pathfinding for all robots needing recalculation
   * This would be called from the ECS system's execute() method
   */
  execute(robotsWithPaths: Array<{ pathComponent: PathComponent; position: Point3D }>): void {
    const startTime = performance.now();

    for (const robot of robotsWithPaths) {
      if (robot.pathComponent.needsRecalculation) {
        this.calculatePath(robot.pathComponent, robot.position);
      }
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Log if execution exceeds budget
    if (executionTime > 2.4) {
      console.warn(
        `PathfindingSystem.execute() took ${executionTime.toFixed(2)}ms (budget: 2.4ms)`,
      );
    }
  }
}
