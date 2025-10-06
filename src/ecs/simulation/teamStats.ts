import type { Team, WeaponType } from "../../types";
import {
  type TeamEntity,
  updateTeamCounts,
  updateTeamStats,
} from "../entities/Team";
import type { WorldView } from "./worldTypes";

function setTeam(world: WorldView, team: Team, entity: TeamEntity): void {
  world.teams[team] = entity;
  if (world.ecs?.teams) {
    world.ecs.teams.clear();
    (Object.values(world.teams) as TeamEntity[]).forEach((teamEntity) => {
      world.ecs.teams.add(teamEntity);
    });
  }
}

export function refreshTeamStats(world: WorldView, teams: Team[]): void {
  teams.forEach((team) => {
    const robots = world.entities.filter((robot) => robot.team === team);
    setTeam(world, team, updateTeamCounts(world.teams[team], robots.length));
    const healthValues = robots.map((robot) => robot.health);
    const weapons: Record<string, WeaponType> = {};
    robots.forEach((robot) => {
      weapons[robot.id] = robot.weaponType;
    });
    setTeam(
      world,
      team,
      updateTeamStats(world.teams[team], healthValues, weapons),
    );
  });
}
