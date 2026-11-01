import { describe, expect, it } from "vitest";

import {
  segmentIntersectsAABB,
  segmentIntersectsCircle,
} from "../../src/lib/math/geometry";
import {
  ARENA_PILLARS,
  ARENA_WALLS,
  isLineOfSightBlocked,
} from "../../src/simulation/environment/arenaGeometry";

/** Brute-force reference: test every static shape, as the pre-index code did. */
function bruteForceLos(
  start: { x: number; z: number },
  end: { x: number; z: number },
): boolean {
  if (start.x === end.x && start.z === end.z) return false;
  for (const wall of ARENA_WALLS) {
    if (
      segmentIntersectsAABB(start, end, wall, wall.halfWidth, wall.halfDepth)
    ) {
      return true;
    }
  }
  for (const pillar of ARENA_PILLARS) {
    if (segmentIntersectsCircle(start, end, pillar, pillar.radius)) {
      return true;
    }
  }
  return false;
}

/** Deterministic LCG so the sweep is reproducible. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe("static occlusion index (#201)", () => {
  it("matches the brute-force line-of-sight sweep over the arena", () => {
    const random = createRandom(201);
    let blocked = 0;

    for (let i = 0; i < 4000; i += 1) {
      const start = {
        x: (random() - 0.5) * 96,
        z: (random() - 0.5) * 96,
      };
      const angle = random() * Math.PI * 2;
      const distance = random() * 40;
      const end = {
        x: start.x + Math.cos(angle) * distance,
        z: start.z + Math.sin(angle) * distance,
      };

      const expected = bruteForceLos(start, end);
      expect(isLineOfSightBlocked(start, end)).toBe(expected);
      if (expected) blocked += 1;
    }

    // Guard against a degenerate sweep that never hits geometry.
    expect(blocked).toBeGreaterThan(500);
    expect(blocked).toBeLessThan(3500);
  });

  it("matches brute force for axis-aligned and corner-crossing segments", () => {
    const segments: Array<[number, number, number, number]> = [
      [-40, 0, 40, 0], // through the central obstacle
      [0, -40, 0, 40], // along the corridor walls
      [-20, -10, 20, -10], // along a corridor wall
      [-24, -24, -24, 24], // vertical, outside the corridors
      [-12, -12, 12, 12], // exact diagonal through cell corners
      [-6, 0, 6, 0], // short, inside the central gap
      [10, 10, 10.001, 10.001], // near-degenerate
      [-50, -50, 50, 50], // corner-to-corner across the arena
    ];

    for (const [x1, z1, x2, z2] of segments) {
      const start = { x: x1, z: z1 };
      const end = { x: x2, z: z2 };
      expect(isLineOfSightBlocked(start, end)).toBe(bruteForceLos(start, end));
    }
  });

  it("treats a zero-length segment as clear", () => {
    const point = { x: 0, y: 0, z: 0 };
    expect(isLineOfSightBlocked(point, point)).toBe(false);
  });
});
