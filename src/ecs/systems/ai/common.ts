import type { Team, Vector3 } from "../../../types";
import type { Robot } from "../../entities/Robot";
import type { TeamEntity } from "../../entities/Team";
import type { WorldView } from "../../simulation/worldTypes";
import { subtractVectors } from "../../utils/vector";

export function getAliveRobots(world: WorldView, team?: Team): Robot[] {
  return world.entities.filter(
    (robot) => robot.health > 0 && (!team || robot.team === team),
  );
}

export function getOpposingTeam(team: Team): Team {
  return team === "red" ? "blue" : "red";
}

export function getBaseFormationOffset(
  world: WorldView,
  robot: Robot,
): Vector3 {
  const team = world.teams[robot.team];
  const index = Number(robot.id.split("-")[1] ?? 0);
  const spawnPoint = team.spawnZone.spawnPoints[index] ?? team.spawnZone.center;
  return subtractVectors(spawnPoint, team.spawnZone.center);
}

export function setTeamEntity(
  world: WorldView,
  team: Team,
  entity: TeamEntity,
): void {
  const previous = world.teams[team];
  world.teams[team] = entity;
  if (world.ecs?.teams) {
    world.ecs.teams.remove(previous);
    world.ecs.teams.add(entity);
  }
}
