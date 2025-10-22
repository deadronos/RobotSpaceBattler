/**
 * Team Factory
 *
 * Creates initial team records for red and blue teams based on arena configuration.
 * This is a pure factory with no side effects.
 *
 * Used by: initializeSimulation()
 */

import type { Team } from "../../types";
import type { ArenaEntity } from "../entities/Arena";
import { createInitialTeam, type TeamEntity } from "../entities/Team";

/**
 * Creates both red and blue team entities initialized for the given arena.
 * Each team is configured with its spawn zone from the arena.
 *
 * @param arena Arena configuration with spawn zones
 * @returns Record mapping team names to initialized TeamEntity objects
 */
export function createTeams(arena: ArenaEntity): Record<Team, TeamEntity> {
  return {
    red: createInitialTeam("red", arena.spawnZones.red),
    blue: createInitialTeam("blue", arena.spawnZones.blue),
  };
}
