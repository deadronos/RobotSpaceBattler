import { describe, expect, it } from "vitest";

import { vec3 } from "../../src/lib/math/vec3";
import { RobotBehaviorMode } from "../../src/simulation/ai/behaviorState";
import { BehaviorBlender } from "../../src/simulation/ai/coordination/BehaviorBlender";
import type { MovementDesire } from "../../src/simulation/ai/coordination/types";
import { planRobotMovement } from "../../src/simulation/ai/pathing";
import type {
  MovementContext,
  MovementPlan,
} from "../../src/simulation/ai/pathing/types";
import { createTestRobot } from "../helpers/robotFactory";

/**
 * #201: the movement planner writes into reused scratch vectors, and callers
 * can hand it a reusable plan. These tests pin that the allocation-free path
 * produces exactly the same plan as the allocating one.
 */
describe("allocation-free movement planning (#201)", () => {
  function contexts(): Array<MovementContext | undefined> {
    return [
      undefined,
      { strafeSign: -1 },
      {
        formationAnchor: vec3(4, 0, -3),
        neighbors: [
          { x: 0.5, y: 0, z: 0.25 },
          { x: -0.5, y: 0, z: 0 },
        ],
      },
    ];
  }

  it("writes into the provided plan without replacing its velocity vector", () => {
    const target = createTestRobot({
      id: "enemy",
      team: "blue",
      position: vec3(12, 0, -4),
    });

    for (const context of contexts()) {
      const robot = createTestRobot({ position: vec3(-3, 0, 2) });
      const expected = planRobotMovement(
        robot,
        RobotBehaviorMode.Engage,
        target,
        undefined,
        context,
      );

      const reusable: MovementPlan = {
        velocity: robot.velocity,
        orientation: 0,
      };
      const actual = planRobotMovement(
        robot,
        RobotBehaviorMode.Engage,
        target,
        undefined,
        context,
        reusable,
      );

      expect(actual).toBe(reusable);
      expect(actual.velocity).toBe(robot.velocity);
      expect(actual.velocity.x).toBe(expected.velocity.x);
      expect(actual.velocity.y).toBe(expected.velocity.y);
      expect(actual.velocity.z).toBe(expected.velocity.z);
      expect(actual.orientation).toBe(expected.orientation);
    }
  });

  it("returns a fresh plan when no reusable plan is passed", () => {
    const robot = createTestRobot();
    const first = planRobotMovement(robot, RobotBehaviorMode.Seek);
    const second = planRobotMovement(robot, RobotBehaviorMode.Seek);

    expect(first).not.toBe(second);
    expect(first.velocity).not.toBe(second.velocity);
    expect(first.velocity).not.toBe(robot.position);
  });

  it("blendRange matches blend for every desire count", () => {
    const blender = new BehaviorBlender();
    const desires: MovementDesire[] = [
      { velocity: vec3(1, 0, 2), priority: "combat", weight: 1 },
      { velocity: vec3(-3, 0, 0.5), priority: "pathfinding", weight: 0.4 },
      { velocity: vec3(0, 0, 12), priority: "retreat", weight: 0.9 },
    ];

    const out = vec3(9, 9, 9);
    for (let count = 0; count <= desires.length; count += 1) {
      const expected = blender.blend(desires.slice(0, count));
      blender.blendRange(desires, count, out);
      expect(out.x).toBe(expected.x);
      expect(out.y).toBe(expected.y);
      expect(out.z).toBe(expected.z);
    }
  });

  it("clamps blended velocities to the blender maximum", () => {
    const blender = new BehaviorBlender();
    const out = vec3();
    const desires: MovementDesire[] = [
      { velocity: vec3(0, 0, 40), priority: "retreat", weight: 1 },
    ];

    blender.blendRange(desires, 1, out);
    expect(Math.hypot(out.x, out.y, out.z)).toBeCloseTo(10, 5);
  });
});
