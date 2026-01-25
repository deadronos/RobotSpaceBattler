/**
 * A* pathfinding algorithm implementation using navmesh library
 * @module pathfinding/search
 */

import { NavMesh as NavMeshLib } from "navmesh";

import type { NavigationMesh, Point2D } from "../types";

/**
 * A* search implementation for pathfinding across navigation mesh
 */
export class AStarSearch {
  private navMeshLib: NavMeshLib;

  constructor(private mesh: NavigationMesh) {
    // Convert mesh polygons to navmesh library format
    const polygons = mesh.polygons.map((poly) =>
      poly.vertices.map((v) => ({ x: v.x, y: v.z })),
    );

    // Initialize navmesh library
    this.navMeshLib = new NavMeshLib(polygons);
  }

  /**
   * Find path from start to target using A* algorithm
   * @returns Array of waypoints or null if no path exists
   */
  findPath(start: Point2D, target: Point2D): Point2D[] | null {
    // Convert Point2D (x, z) to navmesh format (x, y)
    const navStart = { x: start.x, y: start.z };
    const navTarget = { x: target.x, y: target.z };

    // Use navmesh library's findPath method
    const result = this.navMeshLib.findPath(navStart, navTarget);

    // Convert result back to Point2D format
    if (!result || result.length === 0) {
      return null;
    }

    return result.map((point: { x: number; y: number }) => ({
      x: point.x,
      z: point.y,
    }));
  }
}
