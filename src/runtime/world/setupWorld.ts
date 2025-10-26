import { spawnTeams } from "../../ecs/systems/spawnSystem";
import {
  BattleWorld,
  createBattleWorld,
  RobotEntity,
  TeamId,
} from "../../ecs/world";
import { InitialMatchPayload } from "../bootstrap/loadInitialMatch";
import { MatchTraceEventInput } from "../matchTrace";

export interface SetupWorldOptions {
  initialMatch: InitialMatchPayload;
  emitEvent?: (event: MatchTraceEventInput) => void;
}

export interface SetupWorldResult {
  world: BattleWorld;
  robotsByTeam: Record<TeamId, RobotEntity[]>;
}

export function setupWorld({
  initialMatch,
  emitEvent,
}: SetupWorldOptions): SetupWorldResult {
  const world = createBattleWorld();
  const teamRobotCounts: Partial<Record<TeamId, number>> = {};

  initialMatch.teams.forEach((team) => {
    teamRobotCounts[team.id] = team.robotCount;
  });

  const robotsByTeam = spawnTeams(world, {
    seed: initialMatch.seed,
    teamRobotCounts,
    onSpawn: (robot) => {
      emitEvent?.({
        type: "spawn",
        timestampMs: 0,
        entityId: robot.id,
        position: robot.position,
        teamId: robot.team,
      });
    },
  });

  return { world, robotsByTeam };
}
