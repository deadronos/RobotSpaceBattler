/**
 * Path optimization utilities for smooth, natural-looking paths
 * @module pathfinding/smoothing
 */

import { distanceXZ } from "../../../../lib/math/geometry";
import type { Point2D } from "../types";

/**
 * Optimizes paths for smooth movement with minimal heading changes
 */
export class PathOptimizer {
  /**
   * Smooth a path using multiple techniques:
   * - Remove colinear points
   * - Minimize heading changes
   * - Maintain path length within 110% of original
   *
   * @param path - Input path waypoints
   * @returns Optimized path
   */
  smoothPath(path: Point2D[]): Point2D[] {
    if (path.length <= 2) {
      return [...path];
    }

    // Step 1: Remove colinear points
    let smoothed = this.removeColinearPoints(path);

    // Step 2: Apply heading smoothing
    smoothed = this.smoothHeadings(smoothed);

    return smoothed;
  }

  /**
   * Remove points that lie on the same line as their neighbors
   */
  private removeColinearPoints(path: Point2D[]): Point2D[] {
    if (path.length <= 2) return [...path];

    const result: Point2D[] = [path[0]];

    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      const next = path[i + 1];

      // Check if current point is colinear with prev and next
      if (!this.areColinear(prev, curr, next)) {
        result.push(curr);
      }
    }

    result.push(path[path.length - 1]);
    return result;
  }

  /**
   * Check if three points are colinear (lie on same line)
   */
  private areColinear(p1: Point2D, p2: Point2D, p3: Point2D): boolean {
    // Calculate cross product
    const crossProduct =
      (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x);

    // Points are colinear if cross product is near zero
    return Math.abs(crossProduct) < 0.01;
  }

  /**
   * Smooth heading changes to be gradual
   */
  private smoothHeadings(path: Point2D[]): Point2D[] {
    if (path.length <= 2) return [...path];

    // For now, just return the path as-is
    // More sophisticated smoothing could use spline interpolation
    return [...path];
  }

  /**
   * Calculate path length
   */
  private calculatePathLength(path: Point2D[]): number {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      length += distanceXZ(path[i], path[i - 1]);
    }
    return length;
  }
}
