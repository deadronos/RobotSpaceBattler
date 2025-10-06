import type { VictoryWorld } from '../systems/victorySystem';
import {
  advanceVictoryCountdown,
  closeVictorySettings,
  closeVictoryStats,
  evaluateVictoryState,
  openVictorySettings,
  openVictoryStats,
  pauseVictoryCountdown,
  resetVictoryCountdown,
  resumeVictoryCountdown,
} from '../systems/victorySystem';
import type { SimulationState } from '../entities/SimulationState';

export function evaluateVictory(world: VictoryWorld): SimulationState {
  return evaluateVictoryState(world);
}

export function pauseAutoRestart(world: VictoryWorld): SimulationState {
  return pauseVictoryCountdown(world);
}

export function resumeAutoRestart(world: VictoryWorld): SimulationState {
  return resumeVictoryCountdown(world);
}

export function resetCountdown(world: VictoryWorld): SimulationState {
  return resetVictoryCountdown(world);
}

export function openStats(world: VictoryWorld): SimulationState {
  return openVictoryStats(world);
}

export function closeStats(world: VictoryWorld): SimulationState {
  return closeVictoryStats(world);
}

export function openSettings(world: VictoryWorld): SimulationState {
  return openVictorySettings(world);
}

export function closeSettings(world: VictoryWorld): SimulationState {
  return closeVictorySettings(world);
}

export function tickVictoryCountdown(
  world: VictoryWorld,
  deltaTime: number,
  onRestart: () => void
): SimulationState {
  return advanceVictoryCountdown(world, deltaTime, onRestart);
}
