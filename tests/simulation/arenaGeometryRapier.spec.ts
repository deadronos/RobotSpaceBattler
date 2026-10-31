import { describe, it, expect, vi } from "vitest";
import { vec3 } from "../../src/lib/math/vec3";
import { isLineOfSightBlockedRuntime } from "../../src/simulation/environment/arenaGeometry";
import type { RuntimeCheckOptions } from "../../src/simulation/environment/arenaGeometry";

type RapierRaycast = NonNullable<
  NonNullable<RuntimeCheckOptions["rapierWorld"]>["castRayAndGetNormal"]
>;

describe("isLineOfSightBlockedRuntime with Rapier", () => {
  it("returns true when rapierWorld raycast reports a hit", () => {
    const start = vec3(5, 0, 5);
    const end = vec3(15, 0, 5);

    const mockRapier = {
      castRayAndGetNormal: vi.fn<RapierRaycast>(() => ({
        timeOfImpact: 5.0,
        normal: { x: 0, y: 0, z: -1 },
      })),
    } as any;

    const blocked = isLineOfSightBlockedRuntime(start, end, {
      rapierWorld: mockRapier,
    });
    expect(blocked).toBe(true);
    expect(mockRapier.castRayAndGetNormal).toHaveBeenCalled();
  });

  it("falls back to obstacle array when rapierWorld misses", () => {
    const start = vec3(5, 0, 5);
    const end = vec3(15, 0, 5);

    const mockRapier = {
      castRayAndGetNormal: vi.fn<RapierRaycast>(() => null),
    } as any;

    const obstacle = {
      id: "o",
      blocksVision: true,
      active: true,
      position: { x: 10, y: 0, z: 5 },
      shape: { kind: "box", halfWidth: 1, halfDepth: 1 },
    } as any;

    const blocked = isLineOfSightBlockedRuntime(start, end, {
      rapierWorld: mockRapier,
      obstacles: [obstacle],
    });
    expect(blocked).toBe(true);
    expect(mockRapier.castRayAndGetNormal).toHaveBeenCalled();
  });

  it("returns false when rapierWorld misses and no obstacles provided", () => {
    const start = vec3(5, 0, 5);
    const end = vec3(15, 0, 5);

    const mockRapier = {
      castRayAndGetNormal: vi.fn<RapierRaycast>(() => null),
    } as any;

    const blocked = isLineOfSightBlockedRuntime(start, end, {
      rapierWorld: mockRapier,
    });
    expect(blocked).toBe(false);
  });
});
