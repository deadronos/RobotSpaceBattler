import { RobotEntity } from "../../../ecs/world";
import { ROBOT_SEPARATION_DISTANCE } from "../../../lib/constants";
import {
  addVec3,
  cloneVec3,
  lengthVec3,
  normalizeVec3,
  projectOntoPlane,
  ReadonlyVec3,
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
 * Normalized planar direction from `from` to `to`, written into `out`.
 *
 * Allocation-free equivalent of
 * `normalizeVec3(projectOntoPlane(subtractVec3(to, from)))`: the Y component is
 * dropped before normalizing, so the length is over XZ only.
 *
 * @param out - The vector to overwrite.
 * @param from - The starting position (read only).
 * @param to - The target position (read only).
 * @returns `out`.
 */
export function computeForwardDirectionInto(
  out: Vec3,
  from: ReadonlyVec3,
  to: ReadonlyVec3,
): Vec3 {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length === 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return out;
  }

  const inverse = 1 / length;
  out.x = dx * inverse;
  out.y = 0;
  out.z = dz * inverse;
  return out;
}

/**
 * Adds separation forces in place, avoiding a copy of the base velocity.
 *
 * @param velocity - The velocity to modify (already a writable copy).
 * @param robot - The robot entity.
 * @param neighbors - List of positions of nearby robots.
 * @returns `velocity`.
 */
export function applySeparationInto(
  velocity: Vec3,
  robot: RobotEntity,
  neighbors?: readonly Vec3[],
): Vec3 {
  if (!neighbors || neighbors.length === 0) {
    return velocity;
  }

  const origin = robot.position;
  for (let i = 0; i < neighbors.length; i += 1) {
    const neighbor = neighbors[i];
    const dx = origin.x - neighbor.x;
    const dy = origin.y - neighbor.y;
    const dz = origin.z - neighbor.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance === 0) continue;

    const strength =
      Math.max(0, ROBOT_SEPARATION_DISTANCE - distance) /
      ROBOT_SEPARATION_DISTANCE;
    const inverse = 1 / distance;
    velocity.x += dx * inverse * strength;
    velocity.y += dy * inverse * strength;
    velocity.z += dz * inverse * strength;
  }

  return velocity;
}

/**
 * Clamps the magnitude of a velocity vector in place.
 *
 * @param velocity - The velocity to modify.
 * @param maxSpeed - The maximum allowed speed.
 * @returns `velocity`.
 */
export function clampVelocityInto(velocity: Vec3, maxSpeed: number): Vec3 {
  const magnitude = Math.sqrt(
    velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z,
  );
  if (magnitude <= maxSpeed) {
    return velocity;
  }

  const scale = maxSpeed / magnitude;
  velocity.x *= scale;
  velocity.y *= scale;
  velocity.z *= scale;
  return velocity;
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
