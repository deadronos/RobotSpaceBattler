/**
 * Battle State Management Utilities
 *
 * Provides functions for managing overall battle lifecycle:
 * - Resetting battles (clearing entities, projectiles, resetting teams)
 * - Syncing teams to ECS (ensuring teams are in the entity collections)
 *
 * Used by: world.ts (stepSimulation victory countdown callback, potential public API)
 */

import { resetTeamForRestart } from "../entities/Team";
import { createPhysicsState } from "../simulation/physics";
import { refreshTeamStats } from "../simulation/teamStats";
import { spawnInitialTeams } from "../systems/spawnSystem";
import type { SimulationWorld } from "../world";

/** Team names constant */
const TEAM_LIST: ("red" | "blue")[] = ["red", "blue"];

/**
 * Syncs all teams from the world record into the ECS teams collection.
 * Ensures the ECS is updated after team modifications.
 *
 * @param world The simulation world
 */
export function syncTeams(world: SimulationWorld): void {
  world.ecs.teams.clear();
  (Object.values(world.teams) as typeof world.teams[keyof typeof world.teams][]).forEach(
    (team) => {
      world.ecs.teams.add(team);
    },
  );
}

/**
 * Resets the battle to initial state:
 * - Clears all entities and projectiles
 * - Resets physics state
 * - Resets teams to fresh spawn state
 * - Respawns initial teams
 * - Updates team statistics
 *
 * Called at the end of victory countdown to restart battle.
 *
 * @param world The simulation world
 */
export function resetBattle(world: SimulationWorld): void {
  // Clear entities and projectiles
  world.entities = [];
  world.projectiles = [];
  world.physics = createPhysicsState();

  // Clear ECS collections
  world.ecs.robots.clear();
  world.ecs.projectiles.clear();

  // Reset teams to initial state
  TEAM_LIST.forEach((team) => {
    world.teams[team] = resetTeamForRestart(world.teams[team]);
  });

  // Sync teams to ECS
  syncTeams(world);

  // Spawn initial teams
  spawnInitialTeams(world, TEAM_LIST);

  // Update team statistics
  refreshTeamStats(world, TEAM_LIST);
}
