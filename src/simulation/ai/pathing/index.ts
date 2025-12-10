import { RobotEntity } from "../../../ecs/world";
import {
  addVec3,
  lengthVec3,
  normalizeVec3,
  scaleVec3,
  Vec3,
} from "../../../lib/math/vec3";
import {
  isLineOfSightBlockedRuntime,
  isPathBlockedByMovementRuntime,
} from "../../environment/arenaGeometry";
import { RobotBehaviorMode } from "../behaviorState";
import { computeAvoidance } from "./avoidance";
import {
  applySeparation,
  clampVelocity,
  computeForwardDirection,
  computeOrientation,
  resolveSpawnCenter,
} from "./helpers";
import { createPhysicsQueryService } from "./physicsQueryService";
import { computePredictiveAvoidance } from "./predictiveAvoidance";
import { shouldRaycastThisFrame } from "./raycastScheduler";
import { MovementContext, MovementPlan, RapierWorldLike } from "./types";

const SEEK_SPEED = 6;
const RETREAT_SPEED = 7;
const STRAFE_SPEED = 4;
/** Reactive avoidance strength multiplier (increased for better wall clearance) */
const AVOIDANCE_STRENGTH = 1.8;

/**
 * Plans the movement for a robot based on its behavior mode, target, and environment.
 * Combines steering behaviors: seeking, strafing, separation, and avoidance.
 *
 * @param robot - The robot entity.
 * @param mode - The current behavior mode (Seek, Engage, Retreat).
 * @param target - The current target robot (if any).
 * @param spawnCenterOverride - Optional override for the team's spawn center.
 * @param context - Additional movement context (neighbors, anchors, physics).
 * @returns A MovementPlan containing the desired velocity and orientation.
 */
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

  const visionBlocked =
    !!target &&
    context?.obstacles &&
    isLineOfSightBlockedRuntime(robot.position, target.position, {
      obstacles: context.obstacles.filter(
        (o): o is NonNullable<typeof o> => !!o,
      ),
    });

  const movementBlocked =
    !!target &&
    context?.obstacles &&
    isPathBlockedByMovementRuntime(robot.position, target.position, {
      obstacles: context.obstacles.filter(
        (o): o is NonNullable<typeof o> => !!o,
      ),
      rapierWorld: context?.rapierWorld as RapierWorldLike,
    });

  const pathBlocked = !!target && (visionBlocked || movementBlocked);

  // Apply reactive avoidance (always runs). Give computeAvoidance access to runtime obstacles.
  const avoidance = computeAvoidance(robot.position, context?.obstacles);
  if (lengthVec3(avoidance) > 0) {
    desiredVelocity = addVec3(
      desiredVelocity,
      scaleVec3(normalizeVec3(avoidance), SEEK_SPEED * AVOIDANCE_STRENGTH),
    );
  }

  // Apply predictive avoidance when Rapier world is available
  // Only raycast on scheduled frames to distribute load across entities
  if (context?.rapierWorld) {
    const entityId = context.entityId ?? 0;
    const frameCount = context.frameCount ?? 0;

    if (shouldRaycastThisFrame(entityId, frameCount)) {
      const queryService = createPhysicsQueryService(context.rapierWorld);
      const predictiveAvoidance = computePredictiveAvoidance(
        robot.position,
        desiredVelocity,
        queryService,
      );

      // Blend predictive avoidance with existing velocity
      if (lengthVec3(predictiveAvoidance) > 0) {
        desiredVelocity = addVec3(desiredVelocity, predictiveAvoidance);
      }
    }
  }

  // If path is blocked by dynamic obstacle, force a reroute by steering perpendicular to target vector.
  if (process.env.DEBUG_AI) {
    // Debug helper showing whether LOS detection considers obstacles as blocking
    // This is opt-in via DEBUG_AI environment variable during test runs.
    console.log("planRobotMovement", {
      robot: robot.id,
      target: target?.id,
      pathBlocked,
      obstacles: context?.obstacles?.length ?? 0,
    });
  }

  if (pathBlocked && target) {
    const forward = computeForwardDirection(robot.position, target.position);
    const lateral = normalizeVec3({ x: forward.z, y: 0, z: -forward.x });
    desiredVelocity = scaleVec3(lateral, SEEK_SPEED * 0.9);
    robot.ai.blockedFrames = (robot.ai.blockedFrames ?? 0) + 1;
  } else {
    robot.ai.blockedFrames = 0;
  }

  if (robot.ai.blockedFrames && robot.ai.blockedFrames >= 3) {
    // After repeated blockage, pause movement to avoid deadlock and let avoidance push us free.
    desiredVelocity = { x: 0, y: 0, z: 0 };
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

/**
 * Updates a position by integrating velocity over time.
 * @param position - The current position.
 * @param velocity - The velocity vector.
 * @param deltaSeconds - Time step in seconds.
 * @returns The new position.
 */
export function integrateMovement(
  position: Vec3,
  velocity: Vec3,
  deltaSeconds: number,
): Vec3 {
  const delta = scaleVec3(velocity, deltaSeconds);
  return addVec3(position, delta);
}
