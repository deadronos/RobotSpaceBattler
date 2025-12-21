/**
 * Nearest accessible point finder for pathfinding fallback
 * When no path exists to target, finds the closest walkable location
 */

import { isPointInPolygon } from "../../../../lib/math/geometry";
import { distanceVec3 } from "../../../../lib/math/vec3";
import type { NavigationMesh, Point2D, Point3D } from "../types";

/**
 * Finds the nearest accessible point on the navigation mesh when target is unreachable
 */
export class NearestAccessiblePoint {
  constructor(private mesh: NavigationMesh) {}

  /**
   * Finds the closest walkable point to the target position
   * Uses grid-based sampling to find valid positions on the mesh
   *
   * @param target - The unreachable target position
   * @param start - The starting position (to prefer points closer to both start and target)
   * @returns Nearest accessible Point3D, or null if no accessible point found
   */
  findNearest(target: Point3D, start: Point3D): Point3D | null {
    if (this.mesh.polygons.length === 0) {
      return null;
    }

    // Sample points in a grid around the target
    const searchRadius = 50; // Maximum search distance
    const gridStep = 2; // Spacing between sample points
    let nearestPoint: Point3D | null = null;
    let nearestDistance = Infinity;

    // Start with concentric circles outward from target
    for (let radius = 0; radius <= searchRadius; radius += gridStep) {
      // Sample points in a circle at this radius
      const numSamples = Math.max(
        8,
        Math.floor((2 * Math.PI * radius) / gridStep),
      );

      for (let i = 0; i < numSamples; i++) {
        const angle = (i / numSamples) * 2 * Math.PI;
        const sampleX = target.x + radius * Math.cos(angle);
        const sampleZ = target.z + radius * Math.sin(angle);

        // Check if this point is on the navigation mesh
        if (this.isPointOnMesh({ x: sampleX, z: sampleZ })) {
          const candidate: Point3D = { x: sampleX, y: target.y, z: sampleZ };

          // Calculate distance from start (prefer points closer to start)
          const distanceFromStart = distanceVec3(candidate, start);

          if (distanceFromStart < nearestDistance) {
            nearestDistance = distanceFromStart;
            nearestPoint = candidate;
          }
        }
      }

      // If we found a point, return it (prefer closer points)
      if (nearestPoint !== null) {
        return nearestPoint;
      }
    }

    // Fallback: return centroid of first polygon if no point found
    if (this.mesh.polygons.length > 0) {
      const firstPolygon = this.mesh.polygons[0];
      return {
        x: firstPolygon.centroid.x,
        y: target.y,
        z: firstPolygon.centroid.z,
      };
    }

    return null;
  }

  /**
   * Checks if a 2D point lies within any polygon of the navigation mesh
   */
  private isPointOnMesh(point: Point2D): boolean {
    for (const polygon of this.mesh.polygons) {
      if (isPointInPolygon(point, polygon.vertices)) {
        return true;
      }
    }
    return false;
  }
}
