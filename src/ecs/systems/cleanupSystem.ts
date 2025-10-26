import { applyCaptaincy } from "../../lib/captainElection";
import { BattleWorld, RobotEntity, TeamId } from "../world";

export interface CleanupTeamStats {
  active: number;
  eliminations: number;
  captainId: string | null;
  totalKills: number;
}

export interface CleanupSystemOptions {
  totalRobotsPerTeam: Record<TeamId, number>;
}

export function cleanupSystem(
  world: BattleWorld,
  { totalRobotsPerTeam }: CleanupSystemOptions,
): Record<TeamId, CleanupTeamStats> {
  const { world: miniplexWorld } = world;
  const robots = [...world.robots.entities];

  const survivors: Record<TeamId, RobotEntity[]> = {
    red: [],
    blue: [],
  };
  const killTotals: Record<TeamId, number> = {
    red: 0,
    blue: 0,
  };

  robots.forEach((robot: RobotEntity) => {
    if (robot.health <= 0) {
      killTotals[robot.team] += robot.kills;
      miniplexWorld.remove(robot);
      return;
    }

    survivors[robot.team].push(robot);
    killTotals[robot.team] += robot.kills;
  });

  const stats: Record<TeamId, CleanupTeamStats> = {
    red: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
    blue: { active: 0, eliminations: 0, captainId: null, totalKills: 0 },
  };

  (Object.keys(survivors) as TeamId[]).forEach((team) => {
    applyCaptaincy(team, survivors[team]);
    const active = survivors[team].length;
    stats[team] = {
      active,
      eliminations: Math.max(0, (totalRobotsPerTeam[team] ?? 0) - active),
      captainId: survivors[team].find((robot) => robot.isCaptain)?.id ?? null,
      totalKills: killTotals[team],
    };
  });

  return stats;
}
