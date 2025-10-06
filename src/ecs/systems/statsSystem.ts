import type { RobotStats, Team as TeamName } from '../../types';
import type { Robot } from '../entities/Robot';
import { setPostBattleStats, type SimulationState } from '../entities/SimulationState';
import type { TeamEntity, TeamStats } from '../entities/Team';

/**
 * Aggregate final per-robot and per-team stats when a match reaches a terminal state
 * (victory or simultaneous-elimination) and persist them into the SimulationState so
 * UI layers (victory screen / stats overlay) can render them without iterating live
 * entities (which may be reset on restart).
 */
export function capturePostBattleStats({
  robots,
  teams,
  simulation,
}: {
  robots: Robot[];
  teams: Record<TeamName, TeamEntity>;
  simulation: SimulationState;
}): SimulationState {
  // Only capture once and only when the simulation is in a terminal status
  if (!simulation) return simulation;
  if (simulation.status !== 'victory' && simulation.status !== 'simultaneous-elimination') {
    return simulation;
  }
  if (simulation.postBattleStats) {
    return simulation; // already captured
  }

  const perRobot: Record<string, RobotStats> = {};
  robots.forEach((r) => {
    perRobot[r.id] = { ...r.stats };
  });

  const perTeam: Record<TeamName, TeamStats> = {} as Record<TeamName, TeamStats>;
  (Object.keys(teams) as TeamName[]).forEach((teamName) => {
    perTeam[teamName] = { ...teams[teamName].aggregateStats };
  });

  return setPostBattleStats(simulation, {
    perRobot,
    perTeam,
    computedAt: simulation.simulationTime,
  });
}
