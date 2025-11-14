import { RobotEntity } from "../../../ecs/world";
import {
  addVec3,
  lengthVec3,
  normalizeVec3,
  scaleVec3,
  Vec3,
} from "../../../lib/math/vec3";
import { RobotBehaviorMode } from "../behaviorState";
import { computeAvoidance } from "./avoidance";
import {
  applySeparation,
  clampVelocity,
  computeForwardDirection,
  computeOrientation,
  resolveSpawnCenter,
} from "./helpers";
import { MovementContext, MovementPlan } from "./types";

const SEEK_SPEED = 6;
const RETREAT_SPEED = 7;
const STRAFE_SPEED = 4;
const AVOIDANCE_STRENGTH = 1.2;

export function planRobotMovement(
  robot: RobotEntity,
  mode: RobotBehaviorMode,
  target?: RobotEntity,
  spawnCenterOverride?: Vec3,
  context?: MovementContext,
): MovementPlan {
  const spawnCenter = spawnCenterOverride ?? resolveSpawnCenter(robot, context);
  const strafeSign = context?.strafeSign ?? robot.ai.strafeSign ?? 1;
  const formationAnchor =
    context?.formationAnchor ?? robot.ai.anchorPosition ?? null;

  let desiredVelocity = robot.velocity;

  if (mode === RobotBehaviorMode.Retreat) {
    const retreatDirection = computeForwardDirection(
      robot.position,
      spawnCenter,
    );
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

  const avoidance = computeAvoidance(robot.position);
  if (lengthVec3(avoidance) > 0) {
    desiredVelocity = addVec3(
      desiredVelocity,
      scaleVec3(normalizeVec3(avoidance), SEEK_SPEED * AVOIDANCE_STRENGTH),
    );
  }

  desiredVelocity = applySeparation(desiredVelocity, robot, context?.neighbors);
  desiredVelocity = clampVelocity(
    desiredVelocity,
    mode === RobotBehaviorMode.Retreat ? RETREAT_SPEED : SEEK_SPEED,
  );

  const orientation = computeOrientation(desiredVelocity, robot.orientation);

  return {
    velocity: desiredVelocity,
    orientation,
  };
}

export function integrateMovement(
  position: Vec3,
  velocity: Vec3,
  deltaSeconds: number,
): Vec3 {
  const delta = scaleVec3(velocity, deltaSeconds);
  return addVec3(position, delta);
}
