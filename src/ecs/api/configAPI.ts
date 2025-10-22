/**
 * Configuration API
 *
 * Provides functions for updating simulation configuration and team composition.
 * These functions modify world state and return nothing (void).
 */

import type { Team } from "../../types";
import {
  setPendingTeamConfig,
} from "../entities/SimulationState";
import type { SimulationWorld } from "../world";

/**
 * Apply team composition configuration to the simulation.
 *
 * Updates the pending team config that will be applied at the next battle restart.
 * Configuration is passed to all teams via the simulation state.
 *
 * @param world - The simulation world
 * @param config - Team composition configuration (red and blue team settings)
 */
export function applyTeamComposition(
  world: SimulationWorld,
  config: Record<Team, unknown>,
): void {
  world.simulation = setPendingTeamConfig(world.simulation, config);
}
