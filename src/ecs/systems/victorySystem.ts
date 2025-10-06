import type { Team } from "../../types";
import type { Robot } from "../entities/Robot";
import {
  clearVictoryState,
  resetAutoRestartCountdown,
  setCountdownPaused,
  setSettingsOpen,
  setStatsOpen,
  setVictoryState,
  type SimulationState,
  tickAutoRestart,
} from "../entities/SimulationState";
import { isTeamEliminated, type TeamEntity } from "../entities/Team";

export interface VictoryWorld {
  robots: Robot[];
  teams: Record<Team, TeamEntity>;
  simulation: SimulationState;
}

function remainingTeams(teams: Record<Team, TeamEntity>): Team[] {
  return (Object.keys(teams) as Team[]).filter(
    (team) => !isTeamEliminated(teams[team]),
  );
}

export function evaluateVictoryState(world: VictoryWorld): SimulationState {
  const aliveTeams = remainingTeams(world.teams);

  if (aliveTeams.length === 0 && world.robots.length === 0) {
    return setVictoryState(
      world.simulation,
      "draw",
      world.simulation.simulationTime,
    );
  }

  if (aliveTeams.length === 1 && world.simulation.status === "running") {
    return setVictoryState(
      world.simulation,
      aliveTeams[0],
      world.simulation.simulationTime,
    );
  }

  return world.simulation;
}

export function advanceVictoryCountdown(
  world: VictoryWorld,
  deltaTime: number,
  onRestart: () => void,
): SimulationState {
  const previousCountdown = world.simulation.autoRestartCountdown;
  let nextState = tickAutoRestart(world.simulation, deltaTime);
  const currentCountdown = nextState.autoRestartCountdown;

  if (
    previousCountdown !== null &&
    currentCountdown === 0 &&
    !nextState.countdownPaused
  ) {
    nextState = clearVictoryState(nextState);
    onRestart();
  }

  return nextState;
}

export function pauseVictoryCountdown(world: VictoryWorld): SimulationState {
  return setCountdownPaused(world.simulation, true);
}

export function resumeVictoryCountdown(world: VictoryWorld): SimulationState {
  return setCountdownPaused(world.simulation, false);
}

export function resetVictoryCountdown(world: VictoryWorld): SimulationState {
  return resetAutoRestartCountdown(world.simulation);
}

export function openVictoryStats(world: VictoryWorld): SimulationState {
  return setStatsOpen(world.simulation, true);
}

export function closeVictoryStats(world: VictoryWorld): SimulationState {
  return setStatsOpen(world.simulation, false);
}

export function openVictorySettings(world: VictoryWorld): SimulationState {
  return setSettingsOpen(world.simulation, true);
}

export function closeVictorySettings(world: VictoryWorld): SimulationState {
  return setSettingsOpen(world.simulation, false);
}
