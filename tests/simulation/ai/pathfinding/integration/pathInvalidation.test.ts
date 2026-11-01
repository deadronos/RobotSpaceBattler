/**
 * Paths must be re-requested when the followed goal drifts away from the
 * robot's current target (#217). Without this, robots follow the first path
 * they were given and matches stall until the time limit.
 */

import { describe, expect, it } from "vitest";

import { createPathComponent } from "@/simulation/ai/pathfinding/integration/PathComponent";
import { NavMeshResource } from "@/simulation/ai/pathfinding/integration/NavMeshResource";
import {
  DEFAULT_TARGET_MOVE_THRESHOLD,
  PathfindingSystem,
} from "@/simulation/ai/pathfinding/integration/PathfindingSystem";
import { PathResultHandler } from "@/simulation/ai/pathfinding/integration/PathResultHandler";
import { extractArenaConfiguration } from "@/simulation/ai/pathfinding/navmesh/ArenaGeometryExtractor";
import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import type {
  NavigationMesh,
  NavigationPath,
  Point3D,
} from "@/simulation/ai/pathfinding/types";

const LATENCY = 3;

function point(x: number, z: number): Point3D {
  return { x, y: 0, z };
}

function createArenaMesh(): NavigationMesh {
  return new NavMeshGenerator().generateFromArena(extractArenaConfiguration());
}

function createArenaSystem(): PathfindingSystem {
  return new PathfindingSystem(new NavMeshResource(createArenaMesh()), {
    executionMode: "inline",
    resultLatencyTicks: LATENCY,
    enableCaching: false,
    throttleInterval: 0,
  });
}

type Robots = Parameters<PathfindingSystem["execute"]>[0];

/** Runs one step at `tick`; results are applied at request tick + latency. */
function step(system: PathfindingSystem, robots: Robots, tick: number): void {
  system.execute(robots, (tick * 1000) / 60, tick);
}

describe("path invalidation on moving targets", () => {
  it("re-requests a path when the target moves beyond the threshold", () => {
    const system = createArenaSystem();
    const pathComponent = createPathComponent();
    const robots: Robots = [
      { id: "robot-1", pathComponent, position: point(-40, 0) },
    ];
    pathComponent.requestedTarget = point(40, 0);

    step(system, robots, 0);
    expect(pathComponent.status).toBe("calculating");

    for (let tick = 1; tick <= LATENCY; tick += 1) step(system, robots, tick);
    expect(pathComponent.status).toBe("valid");
    expect(pathComponent.pathGoal).toEqual(point(40, 0));
    const firstPath = pathComponent.path;

    // The target robot moved well away from the goal the path was built for.
    pathComponent.requestedTarget = point(40, 12);
    const retargetTick = LATENCY + 1;
    step(system, robots, retargetTick);

    // The stale path is dropped immediately and a new request is in flight.
    expect(pathComponent.status).toBe("calculating");
    expect(pathComponent.path).toBeNull();
    expect(pathComponent.pathGoal).toBeNull();

    for (
      let tick = retargetTick + 1;
      tick <= retargetTick + LATENCY;
      tick += 1
    ) {
      step(system, robots, tick);
    }
    expect(pathComponent.status).toBe("valid");
    expect(pathComponent.pathGoal).toEqual(point(40, 12));
    expect(pathComponent.path).not.toBe(firstPath);
    const last = pathComponent.path!.waypoints.at(-1)!;
    expect(last.x).toBeCloseTo(40, 5);
    expect(last.z).toBeCloseTo(12, 5);

    system.dispose();
  });

  it("keeps a path while the target stays within the threshold", () => {
    const system = createArenaSystem();
    const pathComponent = createPathComponent();
    const robots: Robots = [
      { id: "robot-1", pathComponent, position: point(-40, 0) },
    ];
    pathComponent.requestedTarget = point(40, 0);

    step(system, robots, 0);
    for (let tick = 1; tick <= LATENCY; tick += 1) step(system, robots, tick);
    expect(pathComponent.status).toBe("valid");
    const path = pathComponent.path;

    // A small drift (well below the threshold) must not thrash the path.
    const drift = DEFAULT_TARGET_MOVE_THRESHOLD * 0.5;
    pathComponent.requestedTarget = point(40, drift);
    step(system, robots, LATENCY + 1);

    expect(pathComponent.status).toBe("valid");
    expect(pathComponent.path).toBe(path);
    expect(pathComponent.pathGoal).toEqual(point(40, 0));

    system.dispose();
  });

  it("invalidates stale paths even past the per-tick request budget", () => {
    const system = new PathfindingSystem(
      new NavMeshResource(createArenaMesh()),
      {
        executionMode: "inline",
        maxRequestsPerTick: 1,
        enableCaching: false,
        throttleInterval: 0,
      },
    );

    const stalePath = (): NavigationPath => ({
      waypoints: [point(40, 0)],
      totalDistance: 1,
    });

    const first = createPathComponent();
    first.status = "valid";
    first.path = stalePath();
    first.pathGoal = point(40, 0);
    first.requestedTarget = point(40, 30);

    const second = createPathComponent();
    second.status = "valid";
    second.path = stalePath();
    second.pathGoal = point(40, 0);
    second.requestedTarget = point(40, -30);

    const robots: Robots = [
      { id: "robot-1", pathComponent: first, position: point(-40, 0) },
      { id: "robot-2", pathComponent: second, position: point(-40, 0) },
    ];

    // Only one request fits in the budget, but both stale paths must stop
    // steering the robots.
    step(system, robots, 0);

    expect(first.path).toBeNull();
    expect(second.path).toBeNull();
    expect(first.status).toBe("calculating");
    expect(second.status).toBe("invalid");

    system.dispose();
  });

  it("drops a path when the AI clears the requested target", () => {
    const system = createArenaSystem();
    const pathComponent = createPathComponent();
    pathComponent.status = "valid";
    pathComponent.path = { waypoints: [point(40, 0)], totalDistance: 1 };
    pathComponent.pathGoal = point(40, 0);
    pathComponent.currentWaypointIndex = 2;
    pathComponent.requestedTarget = null;

    step(
      system,
      [{ id: "robot-1", pathComponent, position: point(-40, 0) }],
      0,
    );

    expect(pathComponent.status).toBe("invalid");
    expect(pathComponent.path).toBeNull();
    expect(pathComponent.currentWaypointIndex).toBe(0);

    system.dispose();
  });
});

describe("path result bookkeeping", () => {
  const mesh: NavigationMesh = {
    id: "empty",
    polygons: [],
    adjacency: new Map(),
    clearanceRadius: 0.95,
    metadata: {
      generatedAt: 0,
      arenaSize: { width: 0, depth: 0 },
      polygonCount: 0,
      memorySize: 0,
    },
  };

  const cachedPath: NavigationPath = {
    waypoints: [point(10, 10)],
    totalDistance: 1,
  };

  it("resets waypoint progress and records the goal for a cache hit", () => {
    const handler = new PathResultHandler(
      new NavMeshResource(mesh),
      [],
      undefined,
      () => 0,
    );
    const pathComponent = createPathComponent();
    pathComponent.status = "valid";
    pathComponent.currentWaypointIndex = 4;
    pathComponent.requestedTarget = point(10, 10);

    handler.handleCacheHit(cachedPath, pathComponent, "robot-1", point(10, 10));

    expect(pathComponent.status).toBe("valid");
    expect(pathComponent.path).toBe(cachedPath);
    expect(pathComponent.currentWaypointIndex).toBe(0);
    expect(pathComponent.pathGoal).toEqual(point(10, 10));
  });
});
