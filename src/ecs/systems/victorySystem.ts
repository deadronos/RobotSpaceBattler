import { BattleWorld, TeamId } from "../world";

export function checkVictory(world: BattleWorld): TeamId | null {
  const robots = world.robots.entities;
  const aliveByTeam: Record<TeamId, number> = { red: 0, blue: 0 };

  robots.forEach((robot) => {
    if (robot.health > 0) {
      aliveByTeam[robot.team] += 1;
    }
  });

  if (aliveByTeam.red === 0 && aliveByTeam.blue > 0) {
    return "blue";
  }

  if (aliveByTeam.blue === 0 && aliveByTeam.red > 0) {
    return "red";
  }

  return null;
}
