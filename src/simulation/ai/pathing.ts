import { RobotEntity } from '../../ecs/world';
import {
  addVec3,
  cloneVec3,
  lengthVec3,
  normalizeVec3,
  projectOntoPlane,
  scaleVec3,
  subtractVec3,
  Vec3,
} from '../../lib/math/vec3';
import { TEAM_CONFIGS } from '../../lib/teamConfig';
import { RobotBehaviorMode } from './behaviorState';

const SEEK_SPEED = 6;
const RETREAT_SPEED = 7;
const STRAFE_SPEED = 4;
const SEPARATION_DISTANCE = 1.5;

export interface MovementPlan {
  velocity: Vec3;
  orientation: number;
}

export interface MovementContext {
  formationAnchor?: Vec3;
  neighbors?: Vec3[];
  spawnCenter?: Vec3;
  strafeSign?: 1 | -1;
}

function resolveSpawnCenter(robot: RobotEntity, context?: MovementContext): Vec3 {
  if (context?.spawnCenter) {
    return context.spawnCenter;
  }

  return TEAM_CONFIGS[robot.team].spawnCenter;
}

function computeForwardDirection(from: Vec3, to: Vec3): Vec3 {
  return normalizeVec3(projectOntoPlane(subtractVec3(to, from)));
}

function applySeparation(
  baseVelocity: Vec3,
  robot: RobotEntity,
  neighbors: Vec3[] | undefined,
): Vec3 {
  if (!neighbors || neighbors.length === 0) {
    return baseVelocity;
  }

  const separation = neighbors.reduce<Vec3>((acc, neighbor) => {
    const delta = subtractVec3(robot.position, neighbor);
    const distance = lengthVec3(delta);
    if (distance === 0) {
      return acc;
    }

    const strength = Math.max(0, SEPARATION_DISTANCE - distance) / SEPARATION_DISTANCE;
    const push = scaleVec3(normalizeVec3(delta), strength);
    return addVec3(acc, push);
  }, cloneVec3(baseVelocity));

  return separation;
}

function computeOrientation(velocity: Vec3, fallback: number): number {
  if (lengthVec3(velocity) === 0) {
    return fallback;
  }

  return Math.atan2(velocity.x, velocity.z);
}

function clampVelocity(velocity: Vec3, maxSpeed: number): Vec3 {
  const magnitude = lengthVec3(velocity);
  if (magnitude <= maxSpeed) {
    return velocity;
  }

  return scaleVec3(velocity, maxSpeed / magnitude);
}

export function planRobotMovement(
  robot: RobotEntity,
  mode: RobotBehaviorMode,
  target?: RobotEntity,
  spawnCenterOverride?: Vec3,
  context?: MovementContext,
): MovementPlan {
  const spawnCenter = spawnCenterOverride ?? resolveSpawnCenter(robot, context);
  const strafeSign = context?.strafeSign ?? robot.ai.strafeSign ?? 1;
  const formationAnchor = context?.formationAnchor ?? robot.ai.anchorPosition ?? null;

  let desiredVelocity = robot.velocity;

  if (mode === RobotBehaviorMode.Retreat) {
    const retreatDirection = computeForwardDirection(robot.position, spawnCenter);
    desiredVelocity = scaleVec3(retreatDirection, RETREAT_SPEED);
  } else if (mode === RobotBehaviorMode.Engage && target) {
    const forward = computeForwardDirection(robot.position, target.position);
    const right = normalizeVec3({
      x: forward.z,
      y: 0,
      z: -forward.x,
    });
    const forwardComponent = scaleVec3(forward, SEEK_SPEED);
    const strafeComponent = scaleVec3(right, STRAFE_SPEED * strafeSign);
    const blend = normalizeVec3(addVec3(forwardComponent, strafeComponent));
    desiredVelocity = scaleVec3(blend, STRAFE_SPEED + SEEK_SPEED * 0.25);
  } else if (target) {
    const direction = computeForwardDirection(robot.position, target.position);
    desiredVelocity = scaleVec3(direction, SEEK_SPEED);

    if (context?.formationAnchor) {
      const strafeDirection = normalizeVec3({
        x: direction.z,
        y: 0,
        z: -direction.x,
      });
      const strafeStrength = context.strafeSign ?? robot.ai.strafeSign ?? 1;
      desiredVelocity = addVec3(
        desiredVelocity,
        scaleVec3(strafeDirection, STRAFE_SPEED * 0.5 * strafeStrength),
      );
    }
  } else if (formationAnchor) {
    const direction = computeForwardDirection(robot.position, formationAnchor);
    desiredVelocity = scaleVec3(direction, SEEK_SPEED * 0.75);
  } else {
    const direction = computeForwardDirection(robot.position, spawnCenter);
    desiredVelocity = scaleVec3(direction, SEEK_SPEED * 0.5);
  }

  desiredVelocity = applySeparation(desiredVelocity, robot, context?.neighbors);
  desiredVelocity = clampVelocity(desiredVelocity, mode === RobotBehaviorMode.Retreat ? RETREAT_SPEED : SEEK_SPEED);

  const orientation = computeOrientation(desiredVelocity, robot.orientation);

  return {
    velocity: desiredVelocity,
    orientation,
  };
}

export function integrateMovement(position: Vec3, velocity: Vec3, deltaSeconds: number): Vec3 {
  const delta = scaleVec3(velocity, deltaSeconds);
  return addVec3(position, delta);
}
