import { distanceXZ } from "../../../../lib/math/geometry";
import { AStarSearch } from "../search/AStarSearch";
import { NearestAccessiblePoint } from "../search/NearestAccessiblePoint";
import { PathOptimizer } from "../smoothing/PathOptimizer";
import type { NavigationMesh, Point2D, Point3D } from "../types";
import type { WorkerPathRequest, WorkerPathResult } from "./types";

/**
 * Pure, synchronous pathfinding engine. Usable on a worker thread or on the
 * main thread (fallback). Holds no module-level state.
 */
export interface PathfindingEngine {
  calculatePath(req: WorkerPathRequest): WorkerPathResult;
}

export function createPathfindingEngine(
  mesh: NavigationMesh,
): PathfindingEngine {
  const astar = new AStarSearch(mesh);
  const optimizer = new PathOptimizer();
  const nearestFinder = new NearestAccessiblePoint(mesh);

  return {
    calculatePath(req: WorkerPathRequest): WorkerPathResult {
      const startTime = performance.now();
      const { start, target, enableSmoothing, enableNearestFallback } = req;
      const start2D: Point2D = { x: start.x, z: start.z };
      const target2D: Point2D = { x: target.x, z: target.z };

      try {
        let waypoints2D = astar.findPath(start2D, target2D);

        if (
          (!waypoints2D || waypoints2D.length === 0) &&
          enableNearestFallback
        ) {
          const nearestPoint = nearestFinder.findNearest(target, start);
          if (nearestPoint) {
            waypoints2D = astar.findPath(start2D, {
              x: nearestPoint.x,
              z: nearestPoint.z,
            });
          }
        }

        if (!waypoints2D || waypoints2D.length === 0) {
          return {
            id: req.id,
            path: null,
            status: "no_path",
            durationMs: performance.now() - startTime,
          };
        }

        if (enableSmoothing && waypoints2D.length > 2) {
          waypoints2D = optimizer.smoothPath(waypoints2D);
        }

        const waypoints3D: Point3D[] = waypoints2D.map((wp) => ({
          x: wp.x,
          y: start.y,
          z: wp.z,
        }));

        let totalDistance = 0;
        for (let i = 1; i < waypoints3D.length; i++) {
          totalDistance += distanceXZ(waypoints3D[i], waypoints3D[i - 1]);
        }

        return {
          id: req.id,
          path: {
            waypoints: waypoints3D,
            totalDistance,
            smoothed: enableSmoothing,
          },
          status: "success",
          durationMs: performance.now() - startTime,
        };
      } catch (error) {
        return {
          id: req.id,
          path: null,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          durationMs: performance.now() - startTime,
        };
      }
    },
  };
}
