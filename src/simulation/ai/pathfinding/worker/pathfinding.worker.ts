import { initRuntime, move, spawn } from "multithreading";

import type { ConvexPolygon, NavigationMesh, Point2D, Point3D } from "../types";
import { AStarSearch } from "../search/AStarSearch";
import { PathOptimizer } from "../smoothing/PathOptimizer";
import { NearestAccessiblePoint } from "../search/NearestAccessiblePoint";
import { distanceXZ } from "../../../../lib/math/geometry";
import type { WorkerInitMessage, WorkerPathRequest, WorkerPathResult } from "./types";

// State
let astar: AStarSearch | null = null;
let optimizer: PathOptimizer | null = null;
let nearestFinder: NearestAccessiblePoint | null = null;

// Initialize the worker with the navigation mesh
export function initWorker(mesh: NavigationMesh): boolean {
  try {
    astar = new AStarSearch(mesh);
    optimizer = new PathOptimizer();
    nearestFinder = new NearestAccessiblePoint(mesh);
    return true;
  } catch (error) {
    console.error("Failed to initialize pathfinding worker:", error);
    return false;
  }
}

// Calculate path
export function calculatePath(req: WorkerPathRequest): WorkerPathResult {
  const startTime = performance.now();

  if (!astar || !optimizer || !nearestFinder) {
    return {
      id: req.id,
      path: null,
      status: "failed",
      error: "Worker not initialized",
      durationMs: 0
    };
  }

  const { start, target, enableSmoothing, enableNearestFallback } = req;
  const start2D: Point2D = { x: start.x, z: start.z };
  const target2D: Point2D = { x: target.x, z: target.z };

  try {
    // Find path using A*
    let waypoints2D = astar.findPath(start2D, target2D);
    let success = false;
    let usingFallback = false;

    // Nearest accessible point fallback
    if ((!waypoints2D || waypoints2D.length === 0) && enableNearestFallback) {
      const nearestPoint = nearestFinder.findNearest(target, start);

      if (nearestPoint) {
        const nearestTarget2D: Point2D = { x: nearestPoint.x, z: nearestPoint.z };
        waypoints2D = astar.findPath(start2D, nearestTarget2D);
        if (waypoints2D && waypoints2D.length > 0) {
          usingFallback = true;
        }
      }
    }

    if (waypoints2D && waypoints2D.length > 0) {
      // Apply path smoothing
      if (enableSmoothing && waypoints2D.length > 2) {
        waypoints2D = optimizer.smoothPath(waypoints2D);
      }

      // Convert to 3D waypoints
      const waypoints3D: Point3D[] = waypoints2D.map((wp) => ({
        x: wp.x,
        y: start.y,
        z: wp.z,
      }));

      // Calculate total distance
      let totalDistance = 0;
      for (let i = 1; i < waypoints3D.length; i++) {
        totalDistance += distanceXZ(waypoints3D[i], waypoints3D[i - 1]);
      }

      const durationMs = performance.now() - startTime;

      return {
        id: req.id,
        path: {
          waypoints: waypoints3D,
          totalDistance,
          smoothed: enableSmoothing
        },
        status: "success",
        durationMs
      };
    } else {
      const durationMs = performance.now() - startTime;
      return {
        id: req.id,
        path: null,
        status: "no_path",
        durationMs
      };
    }
  } catch (error) {
    const durationMs = performance.now() - startTime;
    return {
      id: req.id,
      path: null,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      durationMs
    };
  }
}
