import { describe, expect, it } from "vitest";

import { RobotBehaviorMode } from "../../src/simulation/ai/behaviorState";
import {
  integrateMovement,
  planRobotMovement,
} from "../../src/simulation/ai/pathing";
import { createTestRobot } from "../helpers/robotFactory";

describe("planRobotMovement", () => {
  it("moves toward the target while seeking", () => {
    const robot = createTestRobot();
    const target = createTestRobot({
      id: "enemy",
      team: "blue",
      position: { x: 0, y: 0, z: 10 },
    });

    const plan = planRobotMovement(robot, RobotBehaviorMode.Seek, target);
    expect(plan.velocity.z).toBeCloseTo(6, 5);
    expect(plan.velocity.x).toBeCloseTo(0, 5);
    expect(plan.orientation).toBeCloseTo(0, 5);
  });

  it("retreats toward spawn and integrates velocity", () => {
    const robot = createTestRobot({
      position: { x: -2, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
    });
    const target = createTestRobot({
      id: "enemy",
      team: "blue",
      position: { x: -4, y: 0, z: 0 },
    });

    const plan = planRobotMovement(robot, RobotBehaviorMode.Retreat, target);
    expect(plan.velocity.x).toBeLessThan(0);
    expect(plan.orientation).toBeLessThan(0);

    const nextPosition = integrateMovement(robot.position, plan.velocity, 0.5);
    expect(nextPosition.x).toBeLessThan(robot.position.x);
  });

  it("pushes away from nearby allies when anchored", () => {
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      undefined,
      undefined,
      {
        formationAnchor: { x: 0, y: 0, z: 0 },
        neighbors: [{ x: 0.5, y: 0, z: 0 }],
      },
    );

    expect(plan.velocity.x).toBeLessThan(0);
  });

  it("strafes around the target when settled near the anchor", () => {
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    const target = createTestRobot({
      id: "enemy",
      team: "blue",
      position: { x: 0, y: 0, z: 10 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      target,
      undefined,
      {
        formationAnchor: { x: 0, y: 0, z: 0 },
        strafeSign: 1,
      },
    );

    expect(plan.velocity.x).toBeGreaterThan(0);
    expect(plan.velocity.z).toBeGreaterThan(0);
  });

  it("shifts sideways when an ally blocks line of sight to the target", () => {
    const robot = createTestRobot({
      ai: { mode: "engage", targetId: "enemy", strafeSign: 1 },
    });
    const target = createTestRobot({
      id: "enemy",
      team: "blue",
      position: { x: 0, y: 0, z: 8 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Engage,
      target,
      undefined,
      {
        neighbors: [{ x: 0.25, y: 0, z: 3 }],
        strafeSign: 1,
      },
    );

    expect(Math.abs(plan.velocity.x)).toBeGreaterThan(0);
    expect(plan.velocity.z).toBeGreaterThanOrEqual(0);
  });

  it("creates an avoidance velocity when positioned adjacent to a wall", () => {
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: -49 }, // near the outer wall at z = -50
      velocity: { x: 0, y: 0, z: 0 },
      ai: { mode: "seek", strafeSign: 1 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      undefined,
      undefined,
      { formationAnchor: { x: 0, y: 0, z: -49 } },
    );

    // formation anchor equals position would normally yield zero velocity
    // but avoidance from the nearby wall should produce a non-zero push away (positive z)
    expect(plan.velocity.z).toBeGreaterThan(0);
  });
});
