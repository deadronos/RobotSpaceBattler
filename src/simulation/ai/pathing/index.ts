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
import { BehaviorBlender } from "../coordination/BehaviorBlender";
import { MovementDesire } from "../coordination/types";
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
const NAV_DISTANCE_THRESHOLD = 15.0; // Use NavMesh for targets further than this even if LOS is clear

// Prefer Vite's import.meta.env for web builds, fallback to process.env in Node
const viteEnv = (import.meta as unknown as { env?: Record<string, string> })
  .env;
const DEBUG_AI = Boolean(
  viteEnv?.VITE_DEBUG_AI ??
    (typeof process !== "undefined" && process.env?.DEBUG_AI),
);

const blender = new BehaviorBlender();

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

  const desires: MovementDesire[] = [];

  // 1. BASE MOVEMENT DESIRE (Combat/Seeking)
  let baseVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  if (mode === RobotBehaviorMode.Retreat) {
    const retreatDirection = computeForwardDirection(
      robot.position,
      spawnCenter,
    );
    baseVelocity = scaleVec3(retreatDirection, RETREAT_SPEED);
    desires.push({
      velocity: baseVelocity,
      priority: "retreat",
      weight: 1.0,
    });
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
    baseVelocity = scaleVec3(blend, STRAFE_SPEED + SEEK_SPEED * 0.25);
    desires.push({
      velocity: baseVelocity,
      priority: "combat",
      weight: 1.0,
    });
  } else if (target) {
    const direction = computeForwardDirection(robot.position, target.position);
    baseVelocity = scaleVec3(direction, SEEK_SPEED);

    if (context?.formationAnchor) {
      const strafeDirection = normalizeVec3({
        x: direction.z,
        y: 0,
        z: -direction.x,
      });
      const strafeStrength = context.strafeSign ?? robot.ai.strafeSign ?? 1;
      baseVelocity = addVec3(
        baseVelocity,
        scaleVec3(strafeDirection, STRAFE_SPEED * 0.5 * strafeStrength),
      );
    }
    desires.push({
      velocity: baseVelocity,
      priority: "combat",
      weight: 1.0,
    });
  } else if (formationAnchor) {
    const direction = computeForwardDirection(robot.position, formationAnchor);
    baseVelocity = scaleVec3(direction, SEEK_SPEED * 0.75);
    desires.push({
      velocity: baseVelocity,
      priority: "idle",
      weight: 1.0,
    });
  } else {
    const direction = computeForwardDirection(robot.position, spawnCenter);
    baseVelocity = scaleVec3(direction, SEEK_SPEED * 0.5);
    desires.push({
      velocity: baseVelocity,
      priority: "idle",
      weight: 0.5,
    });
  }

  // 2. NAVMESH PATH DESIRE
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

  const distanceToTarget = target
    ? lengthVec3({
        x: robot.position.x - target.position.x,
        y: robot.position.y - target.position.y,
        z: robot.position.z - target.position.z,
      })
    : 0;

  const pathBlocked = !!target && (visionBlocked || movementBlocked);
  const needsPathfinding = pathBlocked || distanceToTarget > NAV_DISTANCE_THRESHOLD;

  if (robot.pathComponent && robot.pathComponent.status === "valid" && robot.pathComponent.path) {
    const path = robot.pathComponent.path;
    const waypoints = path.waypoints;
    let idx = robot.pathComponent.currentWaypointIndex;

    const REACH_THRESHOLD = 0.5;
    while (idx < waypoints.length) {
      const wp = waypoints[idx];
      const dist = lengthVec3({
        x: robot.position.x - wp.x,
        y: robot.position.y - wp.y,
        z: robot.position.z - wp.z,
      });

      if (dist < REACH_THRESHOLD && idx < waypoints.length - 1) {
        idx++;
      } else {
        break;
      }
    }

    robot.pathComponent.currentWaypointIndex = idx;

    if (idx < waypoints.length) {
      const wp = waypoints[idx];
      const steeringTarget = { x: wp.x, y: wp.y, z: wp.z };
      const direction = computeForwardDirection(robot.position, steeringTarget);
      const speed = lengthVec3(baseVelocity) || SEEK_SPEED;
      const pathfindingVelocity = scaleVec3(direction, speed);

      desires.push({
        velocity: pathfindingVelocity,
        priority: "pathfinding",
        // Increase weight if path is explicitly blocked, otherwise use it as a guide
        weight: needsPathfinding ? 1.0 : 0.4,
      });
    }
  }

  // 3. BLEND DESIRES
  let desiredVelocity = blender.blend(desires);

  // 4. APPLY PREDICTIVE AVOIDANCE (DEPRECATED)
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

      if (lengthVec3(predictiveAvoidance) > 0) {
        desiredVelocity = addVec3(desiredVelocity, predictiveAvoidance);
      }
    }
  }

  if (DEBUG_AI) {
    console.log("planRobotMovement", {
      robot: robot.id,
      target: target?.id,
      pathBlocked,
      needsPathfinding,
      desires: desires.length,
    });
  }

  robot.ai.blockedFrames = pathBlocked ? (robot.ai.blockedFrames ?? 0) + 1 : 0;

  if (robot.ai.blockedFrames && robot.ai.blockedFrames >= 3) {
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

export { resolveSpawnCenter } from "./helpers";
