/**
 * World Query API
 *
 * Provides read-only accessor functions for retrieving world state.
 * All functions are pure reads with no side effects.
 */

import type { Vector3 } from "../../types";
import type { ArenaEntity } from "../entities/Arena";
import type { Projectile } from "../entities/Projectile";
import type { SimulationState } from "../entities/SimulationState";
import type { SimulationWorld } from "../world";

/**
 * Get all projectiles currently in the world.
 *
 * @param world - The simulation world
 * @returns Array of all projectiles
 */
export function getProjectiles(world: SimulationWorld): Projectile[] {
  return world.projectiles;
}

/**
 * Get the current simulation state (includes victory status, timers, overlays).
 *
 * @param world - The simulation world
 * @returns Current simulation state
 */
export function getSimulationState(
  world: SimulationWorld,
): SimulationState {
  return world.simulation;
}

/**
 * Get the arena configuration and dimensions.
 *
 * @param world - The simulation world
 * @returns Arena entity
 */
export function getArenaConfig(world: SimulationWorld): ArenaEntity {
  return world.arena;
}

/**
 * Find a robot by ID in the world.
 *
 * @param world - The simulation world
 * @param robotId - The ID of the robot to find
 * @returns The robot entity or undefined if not found
 */
export function getRobotById(world: SimulationWorld, robotId: string) {
  return world.entities.find((robot) => robot.id === robotId);
}

/**
 * Calculate the Euclidean distance between two 3D points.
 *
 * Pure math function with no world dependencies.
 *
 * @param a - First 3D point
 * @param b - Second 3D point
 * @returns Distance between points
 */
export function calculateDistance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}
