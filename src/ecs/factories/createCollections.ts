/**
 * ECS Collections Factory
 *
 * Creates the core ECS (Entity Component System) entity collections used
 * by the simulation. This is a pure factory with no side effects.
 *
 * Used by: initializeSimulation()
 */

import { World as MiniplexWorld } from "miniplex";

import type { Projectile } from "../entities/Projectile";
import type { Robot } from "../entities/Robot";
import type { TeamEntity } from "../entities/Team";

export interface ECSCollections {
  robots: MiniplexWorld<Robot>;
  projectiles: MiniplexWorld<Projectile>;
  teams: MiniplexWorld<TeamEntity>;
}

/**
 * Creates fresh ECS collections for a new simulation world.
 * Each collection is a Miniplex world for efficient entity queries.
 *
 * @returns New ECS collections (robots, projectiles, teams)
 */
export function createECSCollections(): ECSCollections {
  return {
    robots: new MiniplexWorld<Robot>(),
    projectiles: new MiniplexWorld<Projectile>(),
    teams: new MiniplexWorld<TeamEntity>(),
  };
}
