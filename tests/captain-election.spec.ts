import { applyCaptaincy, electCaptain } from "../src/lib/captainElection";
import { RobotEntity, toVec3 } from "../src/ecs/world";

function createRobot(partial: Partial<RobotEntity>): RobotEntity {
  const aiState: RobotEntity['ai'] = {
    mode: 'seek',
    targetId: undefined,
    directive: 'balanced',
    anchorPosition: null,
    anchorDistance: null,
    strafeSign: 1,
    targetDistance: null,
    ...(partial.ai ?? {}),
  };

  return {
    id: partial.id ?? "robot",
    kind: "robot",
    team: partial.team ?? "red",
    position: partial.position ?? toVec3(0, 0, 0),
    velocity: partial.velocity ?? toVec3(0, 0, 0),
    orientation: partial.orientation ?? 0,
    weapon: partial.weapon ?? "laser",
    speed: partial.speed ?? 0,
    fireCooldown: partial.fireCooldown ?? 0,
    fireRate: partial.fireRate ?? 1,
    health: partial.health ?? 100,
    maxHealth: partial.maxHealth ?? 100,
    ai: aiState,
    kills: partial.kills ?? 0,
    isCaptain: partial.isCaptain ?? false,
    spawnIndex: partial.spawnIndex ?? 0,
    lastDamageTimestamp: partial.lastDamageTimestamp ?? 0,
  };
}

describe("captain election", () => {
  it("selects the highest health robot", () => {
    const robots = [
      createRobot({ id: "a", health: 70 }),
      createRobot({ id: "b", health: 90 }),
      createRobot({ id: "c", health: 45 }),
    ];

    expect(electCaptain("red", robots)).toBe("b");
  });

  it("breaks ties using kills then spawn distance then id", () => {
    const robots = [
      createRobot({
        id: "alpha",
        health: 100,
        kills: 1,
        position: toVec3(-10, 0, 0),
      }),
      createRobot({
        id: "beta",
        health: 100,
        kills: 3,
        position: toVec3(-10, 0, 0),
      }),
      createRobot({
        id: "gamma",
        health: 100,
        kills: 3,
        position: toVec3(-8, 0, 0),
      }),
      createRobot({
        id: "delta",
        health: 100,
        kills: 3,
        position: toVec3(-8, 0, 0),
      }),
    ];

    expect(electCaptain("red", robots)).toBe("beta");

    robots[1].kills = 1;
    expect(electCaptain("red", robots)).toBe("delta");

    robots[2].position = toVec3(-11, 0, 0);
    robots[3].position = toVec3(-8, 0, 0);
    expect(electCaptain("red", robots)).toBe("gamma");
  });

  it("updates captain flags in place", () => {
    const robots = [
      createRobot({ id: "r1", health: 100 }),
      createRobot({ id: "r2", health: 50 }),
    ];

    applyCaptaincy("red", robots);
    expect(robots[0].isCaptain).toBe(true);
    expect(robots[1].isCaptain).toBe(false);

    robots[0].health = 0;
    applyCaptaincy("red", robots);
    expect(robots[0].isCaptain).toBe(false);
    expect(robots[1].isCaptain).toBe(true);
  });
});
