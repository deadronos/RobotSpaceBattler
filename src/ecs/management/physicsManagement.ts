/**
 * Physics Management Utilities
 *
 * Provides functions for manipulating physics bodies and reading physics state.
 * Bridges the world API and low-level physics engine.
 *
 * Used by: world.ts public API (setPhysicsBodyPosition, applyPhysicsImpulse, getPhysicsSnapshot)
 */

import type { Vector3 } from "../../types";
import {
  applyRobotImpulse,
  getPhysicsSnapshot as getPhysicsSnapshotInternal,
  setRobotBodyPosition,
} from "../simulation/physics";
import { cloneVector } from "../utils/vector";
import type { SimulationWorld } from "../world";

/**
 * Sets a robot's physics body position in the world space.
 * Updates both the entity position and the physics engine body.
 *
 * @param world The simulation world
 * @param robotId ID of the robot
 * @param position New world position
 */
export function setPhysicsBodyPosition(
  world: SimulationWorld,
  robotId: string,
  position: Vector3,
): void {
  const robot = world.entities.find((entity) => entity.id === robotId);
  if (!robot) {
    return;
  }
  robot.position = cloneVector(position);
  setRobotBodyPosition(world.physics, robot, position);
}

/**
 * Applies an impulse (instantaneous force) to a robot's physics body.
 * Used for explosions, knockback, and other sudden forces.
 *
 * @param world The simulation world
 * @param robotId ID of the robot
 * @param impulse Force vector to apply
 */
export function applyPhysicsImpulse(
  world: SimulationWorld,
  robotId: string,
  impulse: Vector3,
): void {
  const robot = world.entities.find((entity) => entity.id === robotId);
  if (!robot) {
    return;
  }
  applyRobotImpulse(world.physics, robot, impulse);
}

/**
 * Gets a snapshot of the current physics engine state.
 * Useful for debugging and performance monitoring.
 *
 * @param world The simulation world
 * @returns Physics state snapshot
 */
export function getPhysicsSnapshot(world: SimulationWorld) {
  return getPhysicsSnapshotInternal(world.physics);
}
