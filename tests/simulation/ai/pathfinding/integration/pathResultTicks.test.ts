/**
 * Worker path results must only mutate path components inside a sim step, at a
 * deterministic tick and in request order.
 */

import { describe, expect, it, vi } from "vitest";

import { createPathComponent } from "@/simulation/ai/pathfinding/integration/PathComponent";
import { PathCalculator } from "@/simulation/ai/pathfinding/integration/PathCalculator";
import { PathfindingSystem } from "@/simulation/ai/pathfinding/integration/PathfindingSystem";
import { NavMeshResource } from "@/simulation/ai/pathfinding/integration/NavMeshResource";
import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import { ObstacleType } from "@/simulation/ai/pathfinding/types";
import type {
  ArenaConfiguration,
  NavigationMesh,
  Point3D,
} from "@/simulation/ai/pathfinding/types";
import type { NavMeshResource as NavMeshResourceType } from "@/simulation/ai/pathfinding/integration/NavMeshResource";
import type { PathRunResult } from "@/simulation/ai/pathfinding/integration/PathWorkerManager";

const LATENCY = 3;

function mockResource(): NavMeshResourceType {
  return {
    getSerializedMesh: () => ({}),
    recordCalculation: vi.fn<NavMeshResourceType["recordCalculation"]>(),
    updateCacheHitRate: vi.fn<NavMeshResourceType["updateCacheHitRate"]>(),
  } as unknown as NavMeshResourceType;
}

function point(x: number, z: number): Point3D {
  return { x, y: 0, z };
}

function successResult(id: string, target: Point3D): PathRunResult {
  return {
    ok: true,
    value: {
      id,
      path: { waypoints: [target], totalDistance: 1, smoothed: true },
      status: "success",
      durationMs: 1,
    },
  };
}

interface StubRequest {
  id: string;
  target: Point3D;
}

/** Replaces the calculator's protected worker hook with a controllable stub. */
function stubRunWorker(
  calculator: PathCalculator,
  impl: (req: StubRequest) => Promise<PathRunResult>,
): void {
  (calculator as unknown as { runWorker: typeof impl }).runWorker = impl;
}

describe("path result scheduling", () => {
  it("does not apply a result before its due tick", async () => {
    const calculator = new PathCalculator(mockResource(), {
      enableCaching: false,
    });
    const target = point(5, 5);
    const pc = createPathComponent();
    pc.requestedTarget = target;

    stubRunWorker(calculator, async (req) => successResult(req.id, target));

    calculator.setSimTick(10);
    await calculator.calculate(point(0, 0), pc, "r1");

    expect(calculator.queuedResultCount).toBe(1);
    expect(calculator.applyPendingResults(10)).toBe(0);
    expect(calculator.applyPendingResults(12)).toBe(0);
    expect(pc.status).toBe("calculating");

    expect(calculator.applyPendingResults(10 + LATENCY)).toBe(1);
    expect(pc.status).toBe("valid");
  });

  it("applies results in request order even when workers settle out of order", async () => {
    const calculator = new PathCalculator(mockResource(), {
      enableCaching: false,
    });

    const resolvers: Array<() => void> = [];
    stubRunWorker(
      calculator,
      (req) =>
        new Promise((resolve) => {
          resolvers.push(() => resolve(successResult(req.id, req.target)));
        }),
    );

    calculator.setSimTick(0);
    const a = createPathComponent();
    a.requestedTarget = point(1, 1);
    const b = createPathComponent();
    b.requestedTarget = point(2, 2);

    const dispatchedA = calculator.calculate(point(0, 0), a, "r-a");
    const dispatchedB = calculator.calculate(point(0, 0), b, "r-b");

    // The second request finishes first: application order must not follow it.
    resolvers[1]();
    resolvers[0]();
    await Promise.all([dispatchedA, dispatchedB]);

    const applied: string[] = [];
    calculator.onTelemetry((event) => {
      if (event.type === "path-calculation-complete") {
        applied.push(String(event.entityId));
      }
    });

    expect(calculator.applyPendingResults(LATENCY)).toBe(2);
    expect(applied).toEqual(["r-a", "r-b"]);
  });

  it("drops a result superseded by a newer request for the same robot", async () => {
    const calculator = new PathCalculator(mockResource(), {
      enableCaching: false,
      throttleInterval: 0,
    });

    const resolvers: Array<() => void> = [];
    stubRunWorker(
      calculator,
      (req) =>
        new Promise((resolve) => {
          resolvers.push(() => resolve(successResult(req.id, req.target)));
        }),
    );

    calculator.setSimTick(0);
    const pc = createPathComponent();
    pc.requestedTarget = point(1, 1);
    const first = calculator.calculate(point(0, 0), pc, "robot");

    // The robot re-targets before the first result is applied.
    const newer = point(9, 9);
    pc.requestedTarget = newer;
    const second = calculator.calculate(point(0, 0), pc, "robot");

    resolvers[0]();
    resolvers[1]();
    await Promise.all([first, second]);

    expect(calculator.applyPendingResults(LATENCY)).toBe(1);
    expect(pc.path?.waypoints[0]).toEqual(newer);
  });

  it("reset drops buffered results and pending requests", async () => {
    const calculator = new PathCalculator(mockResource(), {
      enableCaching: false,
    });
    const pc = createPathComponent();
    pc.requestedTarget = point(1, 1);

    stubRunWorker(calculator, async (req) =>
      successResult(req.id, point(1, 1)),
    );

    await calculator.calculate(point(0, 0), pc, "r1");
    expect(calculator.queuedResultCount).toBe(1);

    calculator.reset();
    expect(calculator.queuedResultCount).toBe(0);
    expect(calculator.applyPendingResults(99, true)).toBe(0);
  });
});

describe("PathfindingSystem inline execution", () => {
  function makeMesh(): NavigationMesh {
    const config: ArenaConfiguration = {
      origin: { x: 0, z: 0 },
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: "wall",
          type: ObstacleType.WALL,
          footprint: [
            { x: 48, z: 30 },
            { x: 52, z: 30 },
            { x: 52, z: 70 },
            { x: 48, z: 70 },
          ],
          height: 2.5,
          passable: false,
        },
      ],
    };
    return new NavMeshGenerator().generateFromArena(config);
  }

  it("computes paths inside the step and applies them at the due tick", () => {
    const system = new PathfindingSystem(new NavMeshResource(makeMesh()), {
      executionMode: "inline",
      resultLatencyTicks: LATENCY,
    });
    const pc = createPathComponent();
    const robots = [
      { id: "robot-a", pathComponent: pc, position: point(10, 50) },
    ];
    pc.requestedTarget = point(90, 50);

    system.execute(robots, 0, 0);
    expect(pc.status).toBe("calculating");
    expect(system.applyPendingResults(0)).toBe(0);

    system.execute(robots, LATENCY * 16, LATENCY);
    expect(pc.status).toBe("valid");
    expect(pc.path?.waypoints.length).toBeGreaterThanOrEqual(2);

    // The navmesh routes around the wall rather than through it.
    const passesWall = pc.path!.waypoints.some(
      (w) => w.x > 48 && w.x < 52 && w.z > 30 && w.z < 70,
    );
    expect(passesWall).toBe(false);
    system.dispose();
  });
});
