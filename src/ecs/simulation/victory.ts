import type { Robot } from '../entities/Robot';
import type { Team } from '../../types';
import { isTeamEliminated, type TeamEntity } from '../entities/Team';
import {
  clearVictoryState,
  resetAutoRestartCountdown,
  setCountdownPaused,
  setSettingsOpen,
  setStatsOpen,
  setVictoryState,
  tickAutoRestart,
  type SimulationState,
} from '../entities/SimulationState';

export interface VictoryWorld {
  robots: Robot[];
  teams: Record<Team, TeamEntity>;
  simulation: SimulationState;
}

function getRemainingTeams(teams: Record<Team, TeamEntity>): Team[] {
  return (Object.keys(teams) as Team[]).filter((team) => !isTeamEliminated(teams[team]));
}

export function evaluateVictory(world: VictoryWorld): SimulationState {
  const remainingTeams = getRemainingTeams(world.teams);
  if (remainingTeams.length === 0 && world.robots.length === 0) {
    return setVictoryState(world.simulation, 'draw', world.simulation.simulationTime);
  }
  if (remainingTeams.length === 1 && world.simulation.status === 'running') {
    return setVictoryState(world.simulation, remainingTeams[0], world.simulation.simulationTime);
  }

  return world.simulation;
}

export function pauseAutoRestart(world: VictoryWorld): SimulationState {
  return setCountdownPaused(world.simulation, true);
}

export function resumeAutoRestart(world: VictoryWorld): SimulationState {
  return setCountdownPaused(world.simulation, false);
}

export function resetCountdown(world: VictoryWorld): SimulationState {
  return resetAutoRestartCountdown(world.simulation);
}

export function openStats(world: VictoryWorld): SimulationState {
  return setStatsOpen(world.simulation, true);
}

export function closeStats(world: VictoryWorld): SimulationState {
  return setStatsOpen(world.simulation, false);
}

export function openSettings(world: VictoryWorld): SimulationState {
  return setSettingsOpen(world.simulation, true);
}

export function closeSettings(world: VictoryWorld): SimulationState {
  return setSettingsOpen(world.simulation, false);
}

export function tickVictoryCountdown(
  world: VictoryWorld,
  deltaTime: number,
  onRestart: () => void
): SimulationState {
  const previous = world.simulation.autoRestartCountdown;
  let nextState = tickAutoRestart(world.simulation, deltaTime);
  const current = nextState.autoRestartCountdown;

  if (previous !== null && current === 0 && !nextState.countdownPaused) {
    nextState = clearVictoryState(nextState);
    onRestart();
  }

  return nextState;
}
