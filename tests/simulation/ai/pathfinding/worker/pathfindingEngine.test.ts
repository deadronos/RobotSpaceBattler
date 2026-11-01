import { afterEach, describe, expect, it, vi } from "vitest";

import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import { AStarSearch } from "@/simulation/ai/pathfinding/search/AStarSearch";
import type { ArenaConfiguration } from "@/simulation/ai/pathfinding/types";
import { ObstacleType } from "@/simulation/ai/pathfinding/types";
import { createPathfindingEngine } from "@/simulation/ai/pathfinding/worker/pathfindingEngine";
import type { WorkerPathRequest } from "@/simulation/ai/pathfinding/worker/types";

const arena: ArenaConfiguration = {
  origin: { x: 0, z: 0 },
  size: { width: 100, depth: 100 },
  obstacles: [
    {
      id: "wall-1",
      type: ObstacleType.WALL,
      footprint: [
        { x: 40, z: 40 },
        { x: 60, z: 40 },
        { x: 60, z: 45 },
        { x: 40, z: 45 },
      ],
      height: 2.5,
      passable: false,
    },
  ],
};

function makeRequest(
  overrides: Partial<WorkerPathRequest> = {},
): WorkerPathRequest {
  return {
    type: "path_request",
    id: "r1",
    start: { x: 10, y: 1.5, z: 50 },
    target: { x: 90, y: 0, z: 50 },
    enableSmoothing: true,
    enableNearestFallback: false,
    ...overrides,
  };
}

function makeEngine() {
  const mesh = new NavMeshGenerator().generateFromArena(arena);
  return createPathfindingEngine(mesh);
}

describe("PathfindingEngine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns success with waypoints and totalDistance for reachable target", () => {
    const req = makeRequest();
    const result = makeEngine().calculatePath(req);
    expect(result.status).toBe("success");
    expect(result.id).toBe(req.id);
    expect(result.path).not.toBeNull();
    expect(result.path!.waypoints.length).toBeGreaterThanOrEqual(1);
    expect(result.path!.totalDistance).toBeGreaterThan(0);
    for (const wp of result.path!.waypoints) {
      expect(wp.y).toBe(req.start.y);
    }
    expect(result.path!.smoothed).toBe(req.enableSmoothing);
  });

  it("returns no_path for unreachable target when nearest fallback disabled", () => {
    const result = makeEngine().calculatePath(
      makeRequest({
        target: { x: 9999, y: 0, z: 9999 },
        enableNearestFallback: false,
      }),
    );
    expect(result.status).toBe("no_path");
    expect(result.path).toBeNull();
  });

  it("uses nearest accessible point when fallback enabled", () => {
    const result = makeEngine().calculatePath(
      makeRequest({
        target: { x: 9999, y: 0, z: 9999 },
        enableNearestFallback: true,
      }),
    );
    expect(result.status).toBe("success");
  });

  it("returns failed with message when search throws", () => {
    const engine = makeEngine();
    vi.spyOn(AStarSearch.prototype, "findPath").mockImplementation(() => {
      throw new Error("boom");
    });
    const result = engine.calculatePath(makeRequest());
    expect(result.status).toBe("failed");
    expect(result.error).toBe("boom");
  });
});
