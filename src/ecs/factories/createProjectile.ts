/**
 * Projectile Factory Module
 *
 * Creates physics-enabled projectiles in the world with proper initialization.
 * Handles ID generation, projectile entity creation, ECS registration, and physics spawning.
 * Pure factory pattern - all parameters are inputs, returns projectile ID.
 */

import type { Vector3, WeaponType } from "../../types";
import {
  createProjectile,
  type Projectile,
} from "../entities/Projectile";
import { spawnProjectileBody } from "../simulation/physics";
import { getWeaponData } from "../systems/weaponSystem";
import { cloneVector } from "../utils/vector";
import type { SimulationWorld } from "../world";

/**
 * Create a physics-enabled projectile and add it to the world.
 *
 * Generates a unique ID if not provided, initializes the projectile entity,
 * registers it with ECS, and spawns its physics body.
 *
 * @param world - The simulation world
 * @param config - Projectile configuration
 * @param config.id - Optional custom ID; auto-generated if omitted
 * @param config.ownerId - Robot ID of the projectile owner
 * @param config.weaponType - Type of weapon firing this projectile
 * @param config.position - 3D spawn position (will be cloned)
 * @param config.velocity - 3D velocity vector (will be cloned)
 * @param config.damage - Optional damage override; uses weapon base damage if omitted
 * @returns The ID of the created projectile
 */
export function createPhysicsProjectile(
  world: SimulationWorld,
  config: {
    id?: string;
    ownerId: string;
    weaponType: WeaponType;
    position: Vector3;
    velocity: Vector3;
    damage?: number;
  },
): string {
  // Generate unique ID if not provided
  const id =
    config.id ?? `proj-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Get weapon stats for damage and range defaults
  const weapon = getWeaponData(config.weaponType);

  // Create projectile entity with immutable vectors
  const projectile: Projectile = createProjectile({
    id,
    ownerId: config.ownerId,
    weaponType: config.weaponType,
    position: cloneVector(config.position),
    velocity: cloneVector(config.velocity),
    damage: config.damage ?? weapon.baseDamage,
    distanceTraveled: 0,
    maxDistance: weapon.effectiveRange * 2,
    spawnTime: world.simulation.simulationTime,
    maxLifetime: 5,
  });

  // Register projectile with world and ECS
  world.projectiles.push(projectile);
  world.ecs.projectiles.add(projectile);

  // Spawn physics body in Cannon.js engine
  spawnProjectileBody(world.physics, projectile);

  return id;
}
