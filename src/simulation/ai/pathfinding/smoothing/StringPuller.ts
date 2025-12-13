/**
 * String pulling algorithm for path smoothing
 * Uses funnel algorithm from navmesh library
 * @module pathfinding/smoothing
 */

import type { ConvexPolygon, NavigationMesh, Point2D } from "../types";

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
   * @param navMesh - Navigation mesh for line-of-sight checks
   * @returns Smoothed path with fewer waypoints
   */
  smoothPath(path: Point2D[], navMesh?: NavigationMesh): Point2D[] {
    if (path.length <= 2) {
      return [...path]; // Cannot smooth paths with 2 or fewer points
    }

    const smoothed: Point2D[] = [path[0]]; // Always include start point
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      // Try to skip as many waypoints as possible
      let farthestIndex = currentIndex + 1;

      for (
        let testIndex = currentIndex + 2;
        testIndex < path.length;
        testIndex++
      ) {
        // Check if we can go directly from current to test point
        if (
          this.isLineWalkable(path[currentIndex], path[testIndex], navMesh)
        ) {
          farthestIndex = testIndex;
        } else {
          // If we can't reach testIndex, we probably can't reach any further points
          break;
        }
      }

      // Add the farthest reachable point
      smoothed.push(path[farthestIndex]);
      currentIndex = farthestIndex;
    }

    return smoothed;
  }

  /**
   * Check if line segment is valid (walkable)
   * Checks against NavMesh polygons to ensure line stays within walkable space
   */
  private isLineWalkable(
    start: Point2D,
    end: Point2D,
    navMesh?: NavigationMesh,
  ): boolean {
    // If no navMesh is passed, assume wide-open walkable space
    if (!navMesh) return true;

    // 1. Find start polygon
    let currentPolyIndex = this.findPolygonForPoint(start, navMesh);
    if (currentPolyIndex === -1) {
      return false;
    }

    // Optimization: If start and end are in the same convex polygon, it's walkable.
    if (this.isPointInPolygon(end, navMesh.polygons[currentPolyIndex])) {
      return true;
    }

    // Raycast traversal through polygons
    let currentPoint = { ...start };
    const targetPoint = end;

    // Safety break to prevent infinite loops
    let iterations = 0;
    const maxIterations = navMesh.polygons.length * 2;

    while (iterations < maxIterations) {
      const currentPoly = navMesh.polygons[currentPolyIndex];

      // Check if end point is in current polygon
      if (this.isPointInPolygon(targetPoint, currentPoly)) {
        return true;
      }

      // Find intersection with current polygon edges
      const intersection = this.findEdgeIntersection(
        currentPoint,
        targetPoint,
        currentPoly
      );

      if (!intersection) {
        return false;
      }

      // Find neighbor polygon that contains the intersection point
      const nextPolyIndex = this.findNeighborContainingPoint(
        currentPolyIndex,
        intersection.point,
        navMesh
      );

      if (nextPolyIndex === -1) {
        // Hitted a wall (boundary edge with no neighbor)
        return false;
      }

      // Move to next polygon
      currentPolyIndex = nextPolyIndex;
      currentPoint = intersection.point;

      iterations++;
    }

    return false;
  }

  /**
   * Find which polygon contains the point
   */
  private findPolygonForPoint(
    point: Point2D,
    navMesh?: NavigationMesh,
  ): number {
    if (!navMesh) return -1;
    for (const poly of navMesh.polygons) {
      if (this.isPointInPolygon(point, poly)) {
        return poly.index;
      }
    }
    return -1;
  }

  /**
   * Check if point is inside a convex polygon
   */
  private isPointInPolygon(point: Point2D, poly: ConvexPolygon): boolean {
    // Check if explicitly on boundary first
    if (this.isPointOnPolygonBoundary(point, poly)) {
        return true;
    }

    let inside = false;
    const vs = poly.vertices;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x, yi = vs[i].z;
      const xj = vs[j].x, yj = vs[j].z;

      const intersect = ((yi > point.z) !== (yj > point.z))
          && (point.x < (xj - xi) * (point.z - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Find intersection of ray with polygon edges
   */
  private findEdgeIntersection(
    start: Point2D,
    end: Point2D,
    poly: ConvexPolygon
  ): { point: Point2D, edgeIndex: number } | null {
    const vs = poly.vertices;
    let closestDist = Infinity;
    let bestIntersection: { point: Point2D, edgeIndex: number } | null = null;

    for (let i = 0; i < vs.length; i++) {
      const p1 = vs[i];
      const p2 = vs[(i + 1) % vs.length]; // Wrap around

      const intersect = this.getLineIntersection(start, end, p1, p2);
      if (intersect) {
        // We want the intersection that is "forward" along the ray
        // and closest to start (but not AT start, to avoid getting stuck if we are on an edge).
        const dist = (intersect.x - start.x) ** 2 + (intersect.z - start.z) ** 2;
        if (dist > 0.000001 && dist < closestDist) {
            closestDist = dist;
            bestIntersection = { point: intersect, edgeIndex: i };
        }
      }
    }
    return bestIntersection;
  }

  /**
   * Get intersection point of two line segments p1-p2 and p3-p4
   */
  private getLineIntersection(
    p1: Point2D,
    p2: Point2D,
    p3: Point2D,
    p4: Point2D
  ): Point2D | null {
    const x1 = p1.x, y1 = p1.z;
    const x2 = p2.x, y2 = p2.z;
    const x3 = p3.x, y3 = p3.z;
    const x4 = p4.x, y4 = p4.z;

    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null; // Parallel

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    // Check if intersection is within segments
    // We can be a bit lenient with epsilon for "on segment"
    if (ua >= -0.0001 && ua <= 1.0001 && ub >= -0.0001 && ub <= 1.0001) {
      return {
        x: x1 + ua * (x2 - x1),
        z: y1 + ua * (y2 - y1)
      };
    }

    return null;
  }

  /**
   * Find a neighbor polygon that contains the given point on its boundary
   */
  private findNeighborContainingPoint(
    currentPolyIndex: number,
    point: Point2D,
    navMesh?: NavigationMesh
  ): number {
    if (!navMesh) return -1;
    const neighbors = navMesh.adjacency.get(currentPolyIndex);
    if (!neighbors) return -1;

    for (const neighborIndex of neighbors) {
      const neighbor = navMesh.polygons[neighborIndex];
      // Check if point is on any edge of the neighbor
      if (this.isPointOnPolygonBoundary(point, neighbor)) {
        return neighborIndex;
      }
    }
    return -1;
  }

  /**
   * Check if point lies on the boundary of a polygon
   */
  private isPointOnPolygonBoundary(point: Point2D, poly: ConvexPolygon): boolean {
    const vs = poly.vertices;
    const tolerance = 0.001; // Epsilon for checking "on segment"

    for (let i = 0; i < vs.length; i++) {
      const p1 = vs[i];
      const p2 = vs[(i + 1) % vs.length];

      const distSq = this.distanceSquaredPointToSegment(point, p1, p2);
      if (distSq < tolerance * tolerance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Squared distance from point to line segment
   * Copied from NavMeshGenerator or implemented here
   */
  private distanceSquaredPointToSegment(
    p: Point2D,
    v: Point2D,
    w: Point2D,
  ): number {
    const l2 = (v.x - w.x) ** 2 + (v.z - w.z) ** 2;
    if (l2 === 0) return (p.x - v.x) ** 2 + (p.z - v.z) ** 2;

    let t = ((p.x - v.x) * (w.x - v.x) + (p.z - v.z) * (w.z - v.z)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projectionX = v.x + t * (w.x - v.x);
    const projectionZ = v.z + t * (w.z - v.z);

    return (p.x - projectionX) ** 2 + (p.z - projectionZ) ** 2;
  }
}
