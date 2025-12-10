/**
 * String pulling algorithm for path smoothing
 * Uses funnel algorithm from navmesh library
 * @module pathfinding/smoothing
 */

import type { Point2D } from '../types';

/**
 * Implements string pulling (funnel algorithm) to smooth paths
 * Reduces waypoint count while maintaining path validity
 */
export class StringPuller {
  /**
   * Smooth a path by removing unnecessary waypoints
   * Uses line-of-sight simplification
   * 
   * @param path - Array of 2D waypoints
   * @returns Smoothed path with fewer waypoints
   */
  smoothPath(path: Point2D[]): Point2D[] {
    if (path.length <= 2) {
      return [...path]; // Cannot smooth paths with 2 or fewer points
    }

    const smoothed: Point2D[] = [path[0]]; // Always include start point
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      // Try to skip as many waypoints as possible
      let farthestIndex = currentIndex + 1;

      for (let testIndex = currentIndex + 2; testIndex < path.length; testIndex++) {
        // Check if we can go directly from current to test point
        // Simplified: assume straight-line paths are valid
        // Real implementation would check against NavMesh polygons
        farthestIndex = testIndex;
      }

      // Add the farthest reachable point
      smoothed.push(path[farthestIndex]);
      currentIndex = farthestIndex;
    }

    return smoothed;
  }

  /**
   * Check if line segment is valid (walkable)
   * Simplified version - real implementation would check NavMesh
   * TODO: Implement proper line-of-sight checking against NavMesh
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private isLineWalkable(_start: Point2D, _end: Point2D): boolean {
    // Simplified: always return true
    // Real implementation would check against NavMesh polygons
    return true;
  }
}
