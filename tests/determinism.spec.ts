import { describe, expect, it } from "vitest";
import { createBattleWorld } from "../src/ecs/world";
import { spawnTeams } from "../src/ecs/systems/spawnSystem";
import { generateTeamConfigs, TEAM_CONFIGS } from "../src/lib/teamConfig";

describe("Simulation Determinism", () => {
  it("generates the same team configs for the same seed", () => {
    const configs1 = generateTeamConfigs(12345);
    const configs2 = generateTeamConfigs(12345);
    
    expect(configs1.red.spawnCenter).toEqual(configs2.red.spawnCenter);
    expect(configs1.blue.spawnCenter).toEqual(configs2.blue.spawnCenter);
    expect(configs1.red.spawnPoints).toEqual(configs2.red.spawnPoints);
    expect(configs1.blue.spawnPoints).toEqual(configs2.blue.spawnPoints);
  });

  it("generates different team configs for different seeds", () => {
    const configs1 = generateTeamConfigs(1111);
    const configs2 = generateTeamConfigs(2222);
    
    expect(configs1.red.spawnCenter).not.toEqual(configs2.red.spawnCenter);
    expect(configs1.blue.spawnCenter).not.toEqual(configs2.blue.spawnCenter);
  });

  it("ensures TEAM_CONFIGS is constant and deterministic (seed 0)", () => {
    const expected = generateTeamConfigs(0);
    expect(TEAM_CONFIGS.red.spawnCenter).toEqual(expected.red.spawnCenter);
    expect(TEAM_CONFIGS.blue.spawnCenter).toEqual(expected.blue.spawnCenter);
  });

  it("ensures spawnTeams correctly updates world.teams with the match seed", () => {
    const battleWorld = createBattleWorld();
    const seed = 9999;
    
    spawnTeams(battleWorld, { seed });
    
    const expectedConfigs = generateTeamConfigs(seed);
    expect(battleWorld.teams.red.spawnCenter).toEqual(expectedConfigs.red.spawnCenter);
    expect(battleWorld.teams.blue.spawnCenter).toEqual(expectedConfigs.blue.spawnCenter);
    
    // Verify robot positions match the seeded spawn points
    const redRobots = battleWorld.getRobotsByTeam("red");
    redRobots.forEach((robot, index) => {
      const expectedPos = expectedConfigs.red.spawnPoints[index];
      expect(robot.position.x).toBeCloseTo(expectedPos.x);
      expect(robot.position.z).toBeCloseTo(expectedPos.z);
    });
  });
});
