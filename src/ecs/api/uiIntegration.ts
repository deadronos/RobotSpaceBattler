/**
 * UI Integration API
 *
 * Provides thin wrapper functions that delegate to the victory countdown system
 * and performance controller. These wrappers handle the world state plumbing,
 * allowing UI layer to call simple functions without managing SimulationWorld details.
 *
 * All functions preserve world mutations and return nothing (void).
 * UI components read results via hooks that observe world.simulation state.
 */

import {
  getOverlayState,
  recordFrameMetrics as recordFrameMetricsImpl,
  setAutoScalingEnabled as setAutoScalingEnabledImpl,
} from "../simulation/performance";
import {
  closeVictorySettings as closeSettingsImpl,
  closeVictoryStats as closeStatsImpl,
  openVictorySettings as openSettingsImpl,
  openVictoryStats as openStatsImpl,
  pauseVictoryCountdown as pauseCountdownImpl,
  resetVictoryCountdown as resetCountdownImpl,
  resumeVictoryCountdown as resumeCountdownImpl,
} from "../systems/victorySystem";
import type { SimulationWorld } from "../world";

/**
 * Pause the auto-restart countdown timer.
 *
 * @param world - The simulation world state
 */
export function pauseAutoRestart(world: SimulationWorld): void {
  world.simulation = pauseCountdownImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Resume the auto-restart countdown timer.
 *
 * @param world - The simulation world state
 */
export function resumeAutoRestart(world: SimulationWorld): void {
  world.simulation = resumeCountdownImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Reset the auto-restart countdown timer to its initial state.
 *
 * @param world - The simulation world state
 */
export function resetAutoRestartCountdown(world: SimulationWorld): void {
  world.simulation = resetCountdownImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Open the battle statistics overlay in the UI.
 *
 * @param world - The simulation world state
 */
export function openStatsOverlay(world: SimulationWorld): void {
  world.simulation = openStatsImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Close the battle statistics overlay in the UI.
 *
 * @param world - The simulation world state
 */
export function closeStatsOverlay(world: SimulationWorld): void {
  world.simulation = closeStatsImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Open the settings overlay in the UI.
 *
 * @param world - The simulation world state
 */
export function openSettingsOverlay(world: SimulationWorld): void {
  world.simulation = openSettingsImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Close the settings overlay in the UI.
 *
 * @param world - The simulation world state
 */
export function closeSettingsOverlay(world: SimulationWorld): void {
  world.simulation = closeSettingsImpl({
    robots: world.entities,
    teams: world.teams,
    simulation: world.simulation,
  });
}

/**
 * Record frame metrics (FPS) for performance monitoring.
 *
 * @param world - The simulation world state
 * @param fps - Frames per second to record
 */
export function recordFrameMetrics(world: SimulationWorld, fps: number): void {
  world.simulation = recordFrameMetricsImpl(
    world.performance,
    world.simulation,
    world.arena,
    fps,
  );
}

/**
 * Enable or disable auto-scaling based on performance metrics.
 *
 * @param world - The simulation world state
 * @param enabled - Whether auto-scaling should be enabled
 */
export function setAutoScalingEnabled(
  world: SimulationWorld,
  enabled: boolean,
): void {
  setAutoScalingEnabledImpl(world.performance, enabled);
}

/**
 * Get the current state of the performance overlay (visible/hidden).
 *
 * @param world - The simulation world state
 * @returns The current overlay state
 */
export function getPerformanceOverlayState(world: SimulationWorld) {
  return getOverlayState(world.performance);
}
