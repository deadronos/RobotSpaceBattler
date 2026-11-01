import { describe, expect, it } from "vitest";

import { lengthVec3, vec3, Vec3 } from "../../src/lib/math/vec3";
import { TEAM_CONFIGS } from "../../src/lib/teamConfig";
import {
  applySeparation,
  applySeparationInto,
  clampVelocity,
  clampVelocityInto,
  computeForwardDirection,
  computeForwardDirectionInto,
  resolveSpawnCenter,
} from "../../src/simulation/ai/pathing/helpers";
import { createTestRobot } from "../helpers/robotFactory";

describe("pathing helpers", () => {
  it("uses the provided spawn center override", () => {
    const robot = createTestRobot();
    const override: Vec3 = { x: 10, y: 0, z: -20 };
    const context = { spawnCenter: override };

    expect(resolveSpawnCenter(robot, context)).toBe(override);
  });

  it("falls back to the team config spawn center when no override is provided", () => {
    const robot = createTestRobot({ team: "blue" });
    const expectedCenter = TEAM_CONFIGS.blue.spawnCenter;

    expect(resolveSpawnCenter(robot)).toBe(expectedCenter);
  });

  it("normalizes planar direction between two points", () => {
    const from: Vec3 = { x: 0, y: 0, z: 0 };
    const to: Vec3 = { x: 3, y: 5, z: 4 };

    const direction = computeForwardDirection(from, to);
    expect(direction.y).toBe(0);
    expect(direction.x).toBeGreaterThan(0);
    expect(direction.z).toBeGreaterThan(0);
    expect(direction.x * direction.x + direction.z * direction.z).toBeCloseTo(
      1,
      5,
    );
  });

  it("clamps velocity to the specified max speed", () => {
    const velocity: Vec3 = { x: 0, y: 0, z: 10 };
    const clamped = clampVelocity(velocity, 5);

    expect(lengthVec3(clamped)).toBeCloseTo(5, 5);
    expect(clamped.z).toBeGreaterThan(0);
  });
});

describe("allocation-free pathing helpers (#201)", () => {
  it("computeForwardDirectionInto matches computeForwardDirection", () => {
    const cases: Array<[Vec3, Vec3]> = [
      [
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 5, z: 4 },
      ],
      [
        { x: -10, y: 2, z: 3 },
        { x: 10, y: -4, z: -7 },
      ],
      [
        { x: 5, y: 0, z: 5 },
        { x: 5, y: 0, z: 12 },
      ],
      [
        { x: 1, y: 0, z: 1 },
        { x: 1, y: 4, z: 1 },
      ],
      [
        { x: 2, y: 0, z: 2 },
        { x: 2, y: 0, z: 2 },
      ],
    ];

    const out = vec3();
    for (const [from, to] of cases) {
      const expected = computeForwardDirection(from, to);
      computeForwardDirectionInto(out, from, to);
      expect(out.x).toBe(expected.x);
      expect(out.y).toBe(expected.y);
      expect(out.z).toBe(expected.z);
    }
  });

  it("applySeparationInto matches applySeparation", () => {
    const robot = createTestRobot({ position: { x: 1, y: 0, z: -1 } });
    const neighbors: Vec3[] = [
      { x: 1.5, y: 0, z: -1 },
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: -1 },
      { x: 40, y: 0, z: 40 },
    ];
    const base: Vec3 = { x: 0.25, y: 0, z: -0.75 };

    const expected = applySeparation(base, robot, neighbors);
    const actual = applySeparationInto({ ...base }, robot, neighbors);
    expect(actual.x).toBe(expected.x);
    expect(actual.y).toBe(expected.y);
    expect(actual.z).toBe(expected.z);
    // The functional version leaves the input untouched.
    expect(base.x).toBe(0.25);
  });

  it("clampVelocityInto matches clampVelocity", () => {
    const cases: Vec3[] = [
      { x: 0, y: 0, z: 10 },
      { x: 3, y: 0, z: 4 },
      { x: 0, y: 0, z: 0 },
    ];

    for (const velocity of cases) {
      const expected = clampVelocity(velocity, 5);
      const actual = clampVelocityInto({ ...velocity }, 5);
      expect(actual.x).toBe(expected.x);
      expect(actual.y).toBe(expected.y);
      expect(actual.z).toBe(expected.z);
    }
  });
});
