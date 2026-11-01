import type { RobotEntity } from "../../../ecs/world";
import type { Vec3 } from "../../../lib/math/vec3";
import {
  isLineOfSightBlockedRuntime,
  isPathBlockedByMovementRuntime,
  type RuntimeCheckOptions,
} from "../../environment/arenaGeometry";
import type { MovementContext } from "./types";

/** Use the navmesh for targets further than this even if LOS is clear. */
export const NAV_DISTANCE_THRESHOLD = 15.0;
const REACH_THRESHOLD = 0.5;
const PATH_WEIGHT_BLOCKED = 1.0;
const PATH_WEIGHT_GUIDE = 0.4;

/** Result of `computeNavDesire`. The object is reused between calls. */
export interface NavDesireResult {
  /** Waypoint to steer towards, or null when there is no usable path. */
  waypoint: Vec3 | null;
  /** Blend weight for the pathfinding desire. */
  weight: number;
  /** True when an obstacle blocks the straight line to the target. */
  pathBlocked: boolean;
  /** True when the path desire should take over from the base desire. */
  needsPathfinding: boolean;
}

// Per-tick scratch state, reused so the movement plan does not allocate.
const losOptionsScratch: RuntimeCheckOptions = { obstacles: undefined };
const navDesireScratch: NavDesireResult = {
  waypoint: null,
  weight: PATH_WEIGHT_GUIDE,
  pathBlocked: false,
  needsPathfinding: false,
};

/**
 * Computes the navmesh desire for a robot: whether the direct line to the
 * target is blocked and which path waypoint to steer towards.
 *
 * Allocation-free hot path: obstacle lists are passed straight through (the
 * runtime checks skip null entries) and the waypoint is the live path entry.
 *
 * @param robot - The robot entity.
 * @param target - The current target robot (if any).
 * @param obstacles - Runtime obstacles, or undefined to skip dynamic checks.
 * @returns A reused result object, valid until the next call.
 */
export function computeNavDesire(
  robot: RobotEntity,
  target: RobotEntity | undefined,
  obstacles: MovementContext["obstacles"],
): NavDesireResult {
  const result = navDesireScratch;
  const position = robot.position;
  let pathBlocked = false;
  let needsPathfinding = false;

  if (target) {
    if (obstacles) {
      losOptionsScratch.obstacles = obstacles;
      const visionBlocked = isLineOfSightBlockedRuntime(
        position,
        target.position,
        losOptionsScratch,
      );
      const movementBlocked = isPathBlockedByMovementRuntime(
        position,
        target.position,
        losOptionsScratch,
      );
      pathBlocked = visionBlocked || movementBlocked;
    }

    const targetPosition = target.position;
    const dx = position.x - targetPosition.x;
    const dy = position.y - targetPosition.y;
    const dz = position.z - targetPosition.z;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);
    needsPathfinding = pathBlocked || distanceToTarget > NAV_DISTANCE_THRESHOLD;
  }

  result.pathBlocked = pathBlocked;
  result.needsPathfinding = needsPathfinding;
  result.weight = needsPathfinding ? PATH_WEIGHT_BLOCKED : PATH_WEIGHT_GUIDE;
  result.waypoint = null;

  const pathComponent = robot.pathComponent;
  if (pathComponent && pathComponent.status === "valid" && pathComponent.path) {
    const waypoints = pathComponent.path.waypoints;
    let idx = pathComponent.currentWaypointIndex;

    while (idx < waypoints.length) {
      const wp = waypoints[idx];
      const dx = position.x - wp.x;
      const dy = position.y - wp.y;
      const dz = position.z - wp.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < REACH_THRESHOLD && idx < waypoints.length - 1) {
        idx += 1;
      } else {
        break;
      }
    }

    pathComponent.currentWaypointIndex = idx;

    if (idx < waypoints.length) {
      result.waypoint = waypoints[idx];
    }
  }

  return result;
}
