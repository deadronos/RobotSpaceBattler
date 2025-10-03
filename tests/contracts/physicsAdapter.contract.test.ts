/**
 * Physics adapter contract tests.
 *
 * Ensures parity between the Rapier-backed adapter and deterministic test adapter.
 */

import { describe, it, expect } from "vitest";
import {
  createRapierAdapter as createRapierAdapterModule,
  createDeterministicAdapter as createDeterministicAdapterModule,
} from "../../src/utils/physicsAdapter";

type Vector3 = { x: number; y: number; z: number };

const createRapierAdapter = createRapierAdapterModule as unknown as (options: {
  world: {
    raycast: (origin: Vector3, dir: Vector3, maxToi: number) => { toi: number } | null;
    castShape: () => { collided: boolean };
    intersectionWithShape: () => boolean;
  };
}) => {
  raycast: (origin: Vector3, dir: Vector3, maxToi: number) => { toi: number } | null;
  overlapSphere: (center: Vector3, radius: number) => boolean;
  proximity: (origin: Vector3, radius: number) => boolean;
};

const createDeterministicAdapter = createDeterministicAdapterModule as unknown as (
  seed: number
) => {
  raycast: (origin: Vector3, dir: Vector3, maxToi: number) => { toi: number } | null;
  overlapSphere: (center: Vector3, radius: number) => boolean;
  proximity: (origin: Vector3, radius: number) => boolean;
};

describe("physicsAdapter contract", () => {
  it("should return identical results for canonical operations", () => {
    const mockWorld = {
      raycast: () => ({ toi: 1 }),
      castShape: () => ({ collided: true }),
      intersectionWithShape: () => true,
    };

    const rapierAdapter = createRapierAdapter({ world: mockWorld });
    const deterministicAdapter = createDeterministicAdapter(1234);

    const origin = { x: 0, y: 0, z: 0 };
    const dir = { x: 1, y: 0, z: 0 };
    const maxToi = 10;

    const rapierHit = rapierAdapter.raycast(origin, dir, maxToi);
    const deterministicHit = deterministicAdapter.raycast(origin, dir, maxToi);

    expect(rapierHit).toEqual(deterministicHit);
    expect(rapierAdapter.overlapSphere(origin, 5)).toBe(
      deterministicAdapter.overlapSphere(origin, 5)
    );
    expect(rapierAdapter.proximity(origin, 5)).toBe(
      deterministicAdapter.proximity(origin, 5)
    );
  });
});
