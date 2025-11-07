import { spawnTeams } from "../src/ecs/systems/spawnSystem";
import { createBattleWorld, RobotEntity } from "../src/ecs/world";

function countByTeam<T extends { team: "red" | "blue" }>(entities: T[]) {
  return entities.reduce(
    (acc, entity) => {
      acc[entity.team] += 1;
      return acc;
    },
    { red: 0, blue: 0 },
  );
}

describe("spawn system", () => {
  it("spawns 10 robots per team with captains assigned", () => {
    const battleWorld = createBattleWorld();
    spawnTeams(battleWorld, { seed: 1234 });

    const robots = battleWorld.robots.entities;
    const counts = countByTeam(robots);

    expect(robots).toHaveLength(20);
    expect(counts.red).toBe(10);
    expect(counts.blue).toBe(10);

    const redCaptains = robots.filter(
      (robot: RobotEntity) => robot.team === "red" && robot.isCaptain,
    );
    const blueCaptains = robots.filter(
      (robot: RobotEntity) => robot.team === "blue" && robot.isCaptain,
    );

    expect(redCaptains).toHaveLength(1);
    expect(blueCaptains).toHaveLength(1);
  });
});
