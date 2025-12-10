import { RobotEntity } from "../../../ecs/world";
import { ROBOT_SEPARATION_DISTANCE } from "../../../lib/constants";
import {
  addVec3,
  cloneVec3,
  lengthVec3,
  normalizeVec3,
  projectOntoPlane,
  scaleVec3,
  subtractVec3,
  Vec3,
} from "../../../lib/math/vec3";
import { TEAM_CONFIGS } from "../../../lib/teamConfig";
import { MovementContext } from "./types";

/**
 * Determines the target spawn center for a robot, optionally overridden by context.
 * @param robot - The robot entity.
 * @param context - The movement context.
 * @returns The spawn center position.
 */
export function resolveSpawnCenter(
  robot: RobotEntity,
  context?: MovementContext,
): Vec3 {
  if (context?.spawnCenter) {
    return context.spawnCenter;
  }

  return TEAM_CONFIGS[robot.team].spawnCenter;
}

/**
 * Computes a normalized forward direction vector from one point to another.
 * Projects the vector onto the XZ plane to ensure 2D movement.
 *
 * @param from - The starting position.
 * @param to - The target position.
 * @returns A normalized direction vector.
 */
export function computeForwardDirection(from: Vec3, to: Vec3): Vec3 {
  return normalizeVec3(projectOntoPlane(subtractVec3(to, from)));
}

/**
 * Applies a separation force to avoid crowding with nearby neighbors.
 *
 * @param baseVelocity - The robot's intended velocity.
 * @param robot - The robot entity.
 * @param neighbors - List of positions of nearby robots.
 * @returns The modified velocity vector including separation forces.
 */
export function applySeparation(
  baseVelocity: Vec3,
  robot: RobotEntity,
  neighbors?: Vec3[],
): Vec3 {
  if (!neighbors || neighbors.length === 0) {
    return baseVelocity;
  }

  return neighbors.reduce<Vec3>((acc, neighbor) => {
    const delta = subtractVec3(robot.position, neighbor);
    const distance = lengthVec3(delta);
    if (distance === 0) {
      return acc;
    }

    const strength =
      Math.max(0, ROBOT_SEPARATION_DISTANCE - distance) /
      ROBOT_SEPARATION_DISTANCE;
    const push = scaleVec3(normalizeVec3(delta), strength);
    return addVec3(acc, push);
  }, cloneVec3(baseVelocity));
}

/**
 * Computes the orientation angle (in radians) based on velocity.
 * @param velocity - The velocity vector.
 * @param fallback - The fallback orientation if velocity is zero.
 * @returns The orientation angle (rotation around Y).
 */
export function computeOrientation(velocity: Vec3, fallback: number): number {
  if (lengthVec3(velocity) === 0) {
    return fallback;
  }

  return Math.atan2(velocity.x, velocity.z);
}

/**
 * Clamps the magnitude of a velocity vector to a maximum speed.
 * @param velocity - The velocity vector.
 * @param maxSpeed - The maximum allowed speed.
 * @returns The clamped velocity vector.
 */
export function clampVelocity(velocity: Vec3, maxSpeed: number): Vec3 {
  const magnitude = lengthVec3(velocity);
  if (magnitude <= maxSpeed) {
    return velocity;
  }

  return scaleVec3(velocity, maxSpeed / magnitude);
}
