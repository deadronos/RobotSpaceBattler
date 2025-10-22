import { applyCaptaincy } from "../../lib/captainElection";
import { useSimulationStore } from "../../state/simulationStore";
import { BattleWorld, RobotEntity, TeamId } from "../world";

const ROBOTS_PER_TEAM = 10;

export function cleanupSystem(world: BattleWorld): void {
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

  (Object.keys(survivors) as TeamId[]).forEach((team) => {
    applyCaptaincy(team, survivors[team]);
    const active = survivors[team].length;
    useSimulationStore.getState().updateTeamStats(team, {
      active,
      eliminations: Math.max(0, ROBOTS_PER_TEAM - active),
      captainId: survivors[team].find((robot) => robot.isCaptain)?.id ?? null,
      totalKills: killTotals[team],
    });
  });
}
