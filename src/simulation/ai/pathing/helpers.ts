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

export function resolveSpawnCenter(
  robot: RobotEntity,
  context?: MovementContext,
): Vec3 {
  if (context?.spawnCenter) {
    return context.spawnCenter;
  }

  return TEAM_CONFIGS[robot.team].spawnCenter;
}

export function computeForwardDirection(from: Vec3, to: Vec3): Vec3 {
  return normalizeVec3(projectOntoPlane(subtractVec3(to, from)));
}

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

export function computeOrientation(velocity: Vec3, fallback: number): number {
  if (lengthVec3(velocity) === 0) {
    return fallback;
  }

  return Math.atan2(velocity.x, velocity.z);
}

export function clampVelocity(velocity: Vec3, maxSpeed: number): Vec3 {
  const magnitude = lengthVec3(velocity);
  if (magnitude <= maxSpeed) {
    return velocity;
  }

  return scaleVec3(velocity, maxSpeed / magnitude);
}
