import { describe, expect, it } from "vitest";

import { computeTeamAnchors } from "../../src/simulation/ai/captainCoordinator";
import {
  buildFormationAnchor,
  buildTeamDirectives,
  computeEnemyCentroid,
  findCoverPoint,
} from "../../src/simulation/ai/teamStrategy";
import { toVec3 } from "../../src/ecs/world";
import { TEAM_CONFIGS } from "../../src/lib/teamConfig";
import { createTestRobot } from "../helpers/robotFactory";

describe("teamStrategy", () => {
  it("marks advantaged team as offense and disadvantaged as defense", () => {
    const robots = [
      createTestRobot({ id: "r1", team: "red" }),
      createTestRobot({ id: "r2", team: "red" }),
      createTestRobot({ id: "r3", team: "red" }),
      createTestRobot({ id: "b1", team: "blue" }),
    ];

    const directives = buildTeamDirectives(robots);
    expect(directives.red).toBe("offense");
    expect(directives.blue).toBe("defense");
  });

  it("computes enemy centroid", () => {
    const robots = [
      createTestRobot({ id: "r1", team: "red" }),
      createTestRobot({ id: "b1", team: "blue", position: toVec3(10, 0, 0) }),
      createTestRobot({ id: "b2", team: "blue", position: toVec3(0, 0, 10) }),
    ];

    const centroid = computeEnemyCentroid("red", robots);
    expect(centroid).toBeTruthy();
    expect(centroid?.x).toBeCloseTo(5, 5);
    expect(centroid?.z).toBeCloseTo(5, 5);
  });

  it("builds formation anchor around target", () => {
    const robot = createTestRobot({ id: "attacker", spawnIndex: 3 });
    const target = createTestRobot({
      id: "target",
      team: "blue",
      position: toVec3(10, 0, 0),
    });

    const anchor = buildFormationAnchor(robot, target);
    const radius = Math.hypot(
      anchor.x - target.position.x,
      anchor.z - target.position.z,
    );
    expect(radius).toBeCloseTo(5.5, 1);
  });

  it("finds cover point near spawn away from enemies", () => {
    const robot = createTestRobot({
      id: "defender",
      position: toVec3(-5, 0, 0),
    });
    const enemyCentroid = toVec3(10, 0, 0);
    const cover = findCoverPoint(robot, enemyCentroid);
    expect(cover.x).toBeLessThan(robot.position.x);
  });

  it("computes captain anchors per robot", () => {
    const captain = createTestRobot({
      id: "captain-red",
      team: "red",
      isCaptain: true,
      ai: { mode: "seek", targetId: "target", directive: "offense" },
    });
    const ally = createTestRobot({ id: "ally", team: "red", spawnIndex: 2 });
    const target = createTestRobot({
      id: "target",
      team: "blue",
      position: toVec3(20, 0, 0),
    });

    const anchors = computeTeamAnchors([captain, ally, target]);
    expect(anchors.ally.anchorPosition).toBeTruthy();
  });

  it("assigns spaced anchors for balanced directives", () => {
    const spawnCenter = TEAM_CONFIGS.red.spawnCenter;
    const robots = [
      createTestRobot({
        id: "r0",
        team: "red",
        spawnIndex: 0,
        position: spawnCenter,
      }),
      createTestRobot({
        id: "r1",
        team: "red",
        spawnIndex: 1,
        position: spawnCenter,
      }),
      createTestRobot({
        id: "b1",
        team: "blue",
        spawnIndex: 0,
        position: toVec3(30, 0, 0),
      }),
    ];

    const anchors = computeTeamAnchors(robots);
    const r0 = anchors.r0.anchorPosition;
    const r1 = anchors.r1.anchorPosition;
    expect(r0).toBeTruthy();
    expect(r1).toBeTruthy();
    const centroid = computeEnemyCentroid("red", robots);
    expect(centroid).toBeTruthy();
    const r0Radius = Math.hypot(
      (r0?.x ?? 0) - (centroid?.x ?? 0),
      (r0?.z ?? 0) - (centroid?.z ?? 0),
    );
    expect(r0Radius).toBeGreaterThan(1);
    expect(anchors.r0.strafeSign).toBe(1);
    expect(anchors.r1.strafeSign).toBe(-1);
  });
});
