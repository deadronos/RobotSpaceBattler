/**
 * Damage and Combat API
 *
 * Provides functions for damage application and robot elimination.
 * These are thin wrappers over the damage system, delegating world state management.
 */

import {
  applyDamage,
  eliminateRobot as eliminateRobotInternal,
} from "../systems/damageSystem";
import type { SimulationWorld } from "../world";

/**
 * Inflict damage on a robot, applying it to the damage system.
 *
 * The damage system handles clamping and elimination if health reaches zero.
 *
 * @param world - The simulation world
 * @param robotId - ID of the robot to damage
 * @param amount - Amount of damage to apply
 */
export function inflictDamage(
  world: SimulationWorld,
  robotId: string,
  amount: number,
): void {
  applyDamage(world, robotId, amount);
}

/**
 * Eliminate a robot from the simulation.
 *
 * Removes the robot from world state, ECS, physics, and updates team stats.
 *
 * @param world - The simulation world
 * @param robotId - ID of the robot to eliminate
 */
export function eliminateRobot(world: SimulationWorld, robotId: string): void {
  eliminateRobotInternal(world, robotId);
}
