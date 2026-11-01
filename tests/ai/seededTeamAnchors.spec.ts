// @vitest-environment node
import { describe, expect, it } from "vitest";

import { updateAISystem } from "../../src/ecs/systems/aiSystem";
import { spawnTeams } from "../../src/ecs/systems/spawnSystem";
import { createBattleWorld } from "../../src/ecs/world";
import { generateTeamConfigs } from "../../src/lib/teamConfig";
import { computeTeamAnchors } from "../../src/simulation/ai/captainCoordinator";
import {
  buildFormationAnchor,
  findCoverPoint,
} from "../../src/simulation/ai/teamStrategy";
import { createLcg } from "../helpers/aiScenario";
import { createTestRobot } from "../helpers/robotFactory";

/**
 * #215: the AI used to aim retreat, cover and formation anchors at the
 * module-level `TEAM_CONFIGS` (a fixed seed-0 match). These tests pin that the
 * anchors follow the seeded `battleWorld.teams` of the match instead.
 *
 * Seed 987654 is used because its spawn centres are several units away from the
 * seed-0 centres in both X and Z, so a seed-0 read cannot be mistaken for the
 * seeded one.
 */
const SEED = 987654;
const SEEDED = generateTeamConfigs(SEED);
const SEED_ZERO = generateTeamConfigs(0);

function planarDistance(
  a: { x: number; z: number },
  b: { x: number; z: number },
): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

describe("AI anchors use the match's seeded team configs (#215)", () => {
  it("picks a seed whose spawn centres differ from seed 0", () => {
    // Guards the premise of every other test in this file.
    expect(
      planarDistance(SEEDED.red.spawnCenter, SEED_ZERO.red.spawnCenter),
    ).toBeGreaterThan(2);
    expect(
      planarDistance(SEEDED.blue.spawnCenter, SEED_ZERO.blue.spawnCenter),
    ).toBeGreaterThan(2);
  });

  it("places idle team anchors around the seeded spawn centre", () => {
    const robot = createTestRobot({ id: "r0", team: "red", spawnIndex: 0 });

    const anchors = computeTeamAnchors([robot], SEEDED);
    const anchor = anchors.r0.anchorPosition;
    const seededCenter = SEEDED.red.spawnCenter;

    expect(anchor).toBeTruthy();
    expect(anchor?.x).toBeCloseTo(seededCenter.x + 4, 5);
    expect(anchor?.z).toBeCloseTo(seededCenter.z + 4, 5);
    // The seed-0 centre the AI used to read is measurably elsewhere.
    expect(
      Math.abs((anchor?.x ?? 0) - SEED_ZERO.red.spawnCenter.x),
    ).toBeGreaterThan(2);
  });

  it("falls back to the seeded enemy spawn centre for formation anchors", () => {
    const robot = createTestRobot({ id: "r0", team: "red", spawnIndex: 0 });

    const anchor = buildFormationAnchor(robot, undefined, SEEDED);

    // FORMATION_BASE_RADIUS + (spawnIndex % 3) * FORMATION_RADIUS_VARIANCE
    expect(planarDistance(anchor, SEEDED.blue.spawnCenter)).toBeCloseTo(5.5, 5);
    expect(planarDistance(anchor, SEED_ZERO.blue.spawnCenter)).toBeGreaterThan(
      2,
    );
  });

  it("computes cover points relative to the seeded spawn centre", () => {
    const robot = createTestRobot({ id: "r0", team: "red", spawnIndex: 0 });
    const enemyCentroid = { x: 0, y: 0, z: 0 };

    const cover = findCoverPoint(robot, enemyCentroid, SEEDED);
    const seededCenter = SEEDED.red.spawnCenter;
    const seededLength = Math.hypot(seededCenter.x, seededCenter.z);
    const zeroCenter = SEED_ZERO.red.spawnCenter;
    const zeroLength = Math.hypot(zeroCenter.x, zeroCenter.z);

    // 6 + (spawnIndex % 3) away from the centre, back towards home.
    expect(cover.x).toBeCloseTo(
      seededCenter.x + (seededCenter.x / seededLength) * 6,
      5,
    );
    expect(cover.z).toBeCloseTo(
      seededCenter.z + (seededCenter.z / seededLength) * 6,
      5,
    );
    // The seed-0 cover point the AI used to compute is a different position.
    expect(
      planarDistance(cover, {
        x: zeroCenter.x + (zeroCenter.x / zeroLength) * 6,
        z: zeroCenter.z + (zeroCenter.z / zeroLength) * 6,
      }),
    ).toBeGreaterThan(2);
  });

  it("sends a retreating robot towards the seeded spawn centre", () => {
    const battleWorld = createBattleWorld();
    spawnTeams(battleWorld, { seed: SEED });

    const [retreater] = battleWorld.getRobotsByTeam("red");
    const [enemy] = battleWorld.getRobotsByTeam("blue");
    expect(retreater).toBeTruthy();
    expect(enemy).toBeTruthy();

    // Low health plus a visible enemy just outside engage range keeps the
    // robot in retreat without turning the tick into an engage step. Both
    // positions sit in an open lane of the arena so line of sight is clear.
    retreater.health = 1;
    retreater.ai.mode = "retreat";
    retreater.position.x = -45;
    retreater.position.z = -45;
    enemy.position.x = -20;
    enemy.position.z = -45;

    updateAISystem(battleWorld, createLcg(11));

    const seededCenter = battleWorld.teams.red.spawnCenter;
    expect(retreater.ai.mode).toBe("retreat");
    const requested = retreater.pathComponent.requestedTarget;
    expect(requested).toBeTruthy();
    expect(
      planarDistance(requested ?? seededCenter, seededCenter),
    ).toBeLessThan(1e-6);
    // The seed-0 centre the AI used to retreat to is somewhere else.
    expect(
      planarDistance(
        requested ?? SEED_ZERO.red.spawnCenter,
        SEED_ZERO.red.spawnCenter,
      ),
    ).toBeGreaterThan(2);
  });
});
