import type { NavigationMesh, Point2D, Point3D } from "../types";
import type { WorkerPathRequest, WorkerPathResult } from "./types";

// Note: This module is executed in a Worker context via multithreading's spawn().
// The functions are serialized by the multithreading library and executed as the
// default export in the worker. Ensure all dependencies are self-contained.

interface PathfindingWorkerState {
  astar: {
    findPath: (start: Point2D, target: Point2D) => Point2D[] | null;
  } | null;
  optimizer: { smoothPath: (path: Point2D[]) => Point2D[] } | null;
  nearestFinder: {
    findNearest: (target: Point3D, start: Point3D) => Point3D | null;
  } | null;
}

interface PathfindingWorkerModules {
  distanceXZ: (a: Point3D, b: Point3D) => number;
  AStarSearch: new (mesh: NavigationMesh) => {
    findPath: (start: Point2D, target: Point2D) => Point2D[] | null;
  };
  NearestAccessiblePoint: new (mesh: NavigationMesh) => {
    findNearest: (target: Point3D, start: Point3D) => Point3D | null;
  };
  PathOptimizer: new () => { smoothPath: (path: Point2D[]) => Point2D[] };
}

// Web Worker scope types for module caching
interface WorkerScope {
  __pathfindingWorkerModules?: PathfindingWorkerModules;
  __pathfindingWorkerState?: PathfindingWorkerState;
}

const workerScope = self as unknown as WorkerScope;

// Cache modules on worker scope to avoid re-importing
async function loadModules(): Promise<PathfindingWorkerModules> {
  if (workerScope.__pathfindingWorkerModules) {
    return workerScope.__pathfindingWorkerModules;
  }

  const [geometry, astarModule, nearestModule, optimizerModule] =
    await Promise.all([
      import("../../../../lib/math/geometry"),
      import("../search/AStarSearch"),
      import("../search/NearestAccessiblePoint"),
      import("../smoothing/PathOptimizer"),
    ]);

  workerScope.__pathfindingWorkerModules = {
    distanceXZ: geometry.distanceXZ as (a: Point3D, b: Point3D) => number,
    AStarSearch: astarModule.AStarSearch as new (mesh: NavigationMesh) => {
      findPath: (start: Point2D, target: Point2D) => Point2D[] | null;
    },
    NearestAccessiblePoint: nearestModule.NearestAccessiblePoint as new (
      mesh: NavigationMesh,
    ) => { findNearest: (target: Point3D, start: Point3D) => Point3D | null },
    PathOptimizer: optimizerModule.PathOptimizer as new () => {
      smoothPath: (path: Point2D[]) => Point2D[];
    },
  };

  return workerScope.__pathfindingWorkerModules;
}

// Cache pathfinding state on worker scope
const workerState: PathfindingWorkerState = {
  astar: null,
  optimizer: null,
  nearestFinder: null,
};

// Initialize the worker with the navigation mesh
export async function initWorker(mesh: NavigationMesh): Promise<boolean> {
  try {
    const modules = await loadModules();

    workerState.astar = new modules.AStarSearch(mesh);
    workerState.optimizer = new modules.PathOptimizer();
    workerState.nearestFinder = new modules.NearestAccessiblePoint(mesh);

    return true;
  } catch (error) {
    console.error("Failed to initialize pathfinding worker:", error);
    return false;
  }
}

// Calculate path
export async function calculatePath(
  req: WorkerPathRequest,
): Promise<WorkerPathResult> {
  const startTime = performance.now();

  const modules = await loadModules();
  const { astar, optimizer, nearestFinder } = workerState;

  if (!astar || !optimizer || !nearestFinder) {
    return {
      id: req.id,
      path: null,
      status: "failed",
      error: "Worker not initialized",
      durationMs: 0,
    };
  }

  const { start, target, enableSmoothing, enableNearestFallback } = req;
  const start2D: Point2D = { x: start.x, z: start.z };
  const target2D: Point2D = { x: target.x, z: target.z };

  try {
    // Find path using A*
    let waypoints2D = astar.findPath(start2D, target2D);

    // Nearest accessible point fallback
    if ((!waypoints2D || waypoints2D.length === 0) && enableNearestFallback) {
      const nearestPoint = nearestFinder.findNearest(target, start);

      if (nearestPoint) {
        const nearestTarget2D: Point2D = {
          x: nearestPoint.x,
          z: nearestPoint.z,
        };
        waypoints2D = astar.findPath(start2D, nearestTarget2D);
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
        totalDistance += modules.distanceXZ(waypoints3D[i], waypoints3D[i - 1]);
      }

      const durationMs = performance.now() - startTime;

      return {
        id: req.id,
        path: {
          waypoints: waypoints3D,
          totalDistance,
          smoothed: enableSmoothing,
        },
        status: "success",
        durationMs,
      };
    } else {
      const durationMs = performance.now() - startTime;
      return {
        id: req.id,
        path: null,
        status: "no_path",
        durationMs,
      };
    }
  } catch (error) {
    const durationMs = performance.now() - startTime;
    return {
      id: req.id,
      path: null,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    };
  }
}
