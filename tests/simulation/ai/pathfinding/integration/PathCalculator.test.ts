import { describe, test, expect, vi } from "vitest";
import { createPathComponent } from "@/simulation/ai/pathfinding/integration/PathComponent";
import { PathCalculator } from "@/simulation/ai/pathfinding/integration/PathCalculator";
import type { Point3D } from "@/simulation/ai/pathfinding/types";

function makePoint(x = 0, z = 0): Point3D {
  return { x, y: 0, z };
}

describe("PathCalculator", () => {
  test("uses cache when available and emits fromCache telemetry", async () => {
    const navMeshResource: any = {
      getSerializedMesh: () => ({}),
      recordCalculation: vi.fn(),
      updateCacheHitRate: vi.fn(),
    };

    const calculator = new PathCalculator(navMeshResource, { enableCaching: true });

    // Access private cache to seed a cached path
    const cache = (calculator as any).cache;
    const start = makePoint(0, 0);
    const target = makePoint(10, 0);
    const cachedPath = { waypoints: [target], totalDistance: 10 };
    cache.set(start, target, cachedPath);

    const pc = createPathComponent();
    pc.requestedTarget = target;

    const events: any[] = [];
    calculator.onTelemetry((e) => events.push(e));

    await calculator.calculate(start, pc, "robot-1");

    expect(pc.path).toBe(cachedPath);
    expect(pc.status).toBe("valid");

    const complete = events.find((e) => e.type === "path-calculation-complete");
    expect(complete).toBeTruthy();
    expect(complete.fromCache).toBe(true);
  });

  test("handles worker success and emits telemetry", async () => {
    const navMeshResource: any = {
      getSerializedMesh: () => ({}),
      recordCalculation: vi.fn(),
      updateCacheHitRate: vi.fn(),
    };

    const calculator = new PathCalculator(navMeshResource, { enableCaching: false });

    const start = makePoint(0, 0);
    const target = makePoint(5, 5);

    const pc = createPathComponent();
    pc.requestedTarget = target;

    // Monkeypatch runWorker to simulate worker success
    (calculator as any).runWorker = async (req: any) => {
      return {
        ok: true,
        value: {
          id: req.id,
          path: { waypoints: [target], totalDistance: 7, smoothed: true },
          status: "success",
          durationMs: 5,
        },
      };
    };

    const events: any[] = [];
    calculator.onTelemetry((e) => events.push(e));

    await calculator.calculate(start, pc, "r2");

    expect(pc.path).toBeTruthy();
    expect(pc.status).toBe("valid");
    const complete = events.find((e) => e.type === "path-calculation-complete");
    expect(complete.success).toBe(true);
    expect(complete.fromCache).toBeFalsy();
  });

  test("handles worker no_path and emits failed telemetry", async () => {
    const navMeshResource: any = {
      getSerializedMesh: () => ({}),
      recordCalculation: vi.fn(),
      updateCacheHitRate: vi.fn(),
    };

    const calculator = new PathCalculator(navMeshResource, { enableCaching: false });

    const start = makePoint(0, 0);
    const target = makePoint(50, 50);

    const pc = createPathComponent();
    pc.requestedTarget = target;

    (calculator as any).runWorker = async (req: any) => ({ ok: true, value: { id: req.id, path: null, status: "no_path", durationMs: 3 } });

    const events: any[] = [];
    calculator.onTelemetry((e) => events.push(e));

    await calculator.calculate(start, pc, "r3");

    expect(pc.path).toBeNull();
    expect(pc.status).toBe("failed");
    const failed = events.find((e) => e.type === "path-calculation-failed");
    expect(failed).toBeTruthy();
  });
});
