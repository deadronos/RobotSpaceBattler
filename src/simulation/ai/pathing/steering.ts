import type { RobotEntity } from "../../../ecs/world";
import { lengthVec3, Vec3, vec3 } from "../../../lib/math/vec3";
import { RobotBehaviorMode } from "../behaviorState";
import { BehaviorBlender } from "../coordination/BehaviorBlender";
import type { MovementDesire } from "../coordination/types";
import {
  applySeparationInto,
  clampVelocityInto,
  computeForwardDirectionInto,
  computeOrientation,
} from "./helpers";
import type { MovementPlan } from "./types";

export const SEEK_SPEED = 6;
export const RETREAT_SPEED = 7;
const STRAFE_SPEED = 4;

const blender = new BehaviorBlender();

// Per-tick scratch state. The simulation is single threaded and the AI system
// is not re-entrant, so the movement planner can write into these in place.
const base = vec3();
const forward = vec3();
const right = vec3();
const pathVelocity = vec3();
const desires: MovementDesire[] = [
  { velocity: base, priority: "combat", weight: 1 },
  { velocity: pathVelocity, priority: "pathfinding", weight: 1 },
];

/** Writes `direction * speed` into `out` (scaleVec3 equivalent, in place). */
function scaleInto(out: Vec3, x: number, y: number, z: number, speed: number) {
  out.x = x * speed;
  out.y = y * speed;
  out.z = z * speed;
}

/** Normalizes (x, 0, z) into `out`, matching `normalizeVec3({x, y: 0, z})`. */
function normalizePlanarInto(out: Vec3, x: number, z: number): void {
  const length = Math.sqrt(x * x + z * z);
  if (length === 0) {
    out.x = 0;
    out.y = 0;
    out.z = 0;
    return;
  }

  const inverse = 1 / length;
  out.x = x * inverse;
  out.y = 0;
  out.z = z * inverse;
}

/**
 * Builds the base movement desire (retreat / combat / idle) into the shared
 * scratch vector. Allocation-free equivalent of the original vector maths.
 *
 * @param robot - The robot entity.
 * @param mode - The current behavior mode.
 * @param target - The current target robot (if any).
 * @param spawnCenter - The team spawn center.
 * @param contextAnchor - `context.formationAnchor` exactly as passed in.
 * @param formationAnchor - The resolved anchor position (context or AI state).
 * @param strafeSign - The preferred strafing direction.
 */
export function computeBaseDesire(
  robot: RobotEntity,
  mode: RobotBehaviorMode,
  target: RobotEntity | undefined,
  spawnCenter: Vec3,
  contextAnchor: Vec3 | undefined,
  formationAnchor: Vec3 | null,
  strafeSign: number,
): void {
  const desire = desires[0];

  if (mode === RobotBehaviorMode.Retreat) {
    computeForwardDirectionInto(base, robot.position, spawnCenter);
    scaleInto(base, base.x, base.y, base.z, RETREAT_SPEED);
    desire.priority = "retreat";
    desire.weight = 1.0;
    return;
  }

  if (mode === RobotBehaviorMode.Engage && target) {
    computeForwardDirectionInto(forward, robot.position, target.position);
    // right = normalizeVec3({ x: forward.z, y: 0, z: -forward.x })
    normalizePlanarInto(right, forward.z, -forward.x);
    // blend = forward * SEEK_SPEED + right * (STRAFE_SPEED * strafeSign)
    const blendX =
      forward.x * SEEK_SPEED + right.x * (STRAFE_SPEED * strafeSign);
    const blendY =
      forward.y * SEEK_SPEED + right.y * (STRAFE_SPEED * strafeSign);
    const blendZ =
      forward.z * SEEK_SPEED + right.z * (STRAFE_SPEED * strafeSign);
    const length = Math.sqrt(
      blendX * blendX + blendY * blendY + blendZ * blendZ,
    );
    if (length === 0) {
      base.x = 0;
      base.y = 0;
      base.z = 0;
    } else {
      const inverse = 1 / length;
      const speed = STRAFE_SPEED + SEEK_SPEED * 0.25;
      base.x = blendX * inverse * speed;
      base.y = blendY * inverse * speed;
      base.z = blendZ * inverse * speed;
    }
    desire.priority = "combat";
    desire.weight = 1.0;
    return;
  }

  if (target) {
    computeForwardDirectionInto(forward, robot.position, target.position);
    scaleInto(base, forward.x, forward.y, forward.z, SEEK_SPEED);

    if (contextAnchor) {
      normalizePlanarInto(right, forward.z, -forward.x);
      const strafeStrength = strafeSign;
      base.x += right.x * (STRAFE_SPEED * 0.5 * strafeStrength);
      base.y += right.y * (STRAFE_SPEED * 0.5 * strafeStrength);
      base.z += right.z * (STRAFE_SPEED * 0.5 * strafeStrength);
    }
    desire.priority = "combat";
    desire.weight = 1.0;
    return;
  }

  if (formationAnchor) {
    computeForwardDirectionInto(base, robot.position, formationAnchor);
    scaleInto(base, base.x, base.y, base.z, SEEK_SPEED * 0.75);
    desire.priority = "idle";
    desire.weight = 1.0;
    return;
  }

  computeForwardDirectionInto(base, robot.position, spawnCenter);
  scaleInto(base, base.x, base.y, base.z, SEEK_SPEED * 0.5);
  desire.priority = "idle";
  desire.weight = 0.5;
}

/**
 * Blends the base desire with an optional pathfinding desire into `out`.
 *
 * Must be called after `computeBaseDesire` for the same robot, before anything
 * else reuses the scratch vectors.
 *
 * @param robot - The robot entity.
 * @param waypoint - Path waypoint to steer towards, or null.
 * @param weight - Blend weight for the pathfinding desire.
 * @param out - The vector to overwrite with the blended velocity.
 * @returns The number of blended desires (for debug output).
 */
export function blendDesires(
  robot: RobotEntity,
  waypoint: Vec3 | null,
  weight: number,
  out: Vec3,
): number {
  let count = 1;

  if (waypoint) {
    computeForwardDirectionInto(pathVelocity, robot.position, waypoint);
    const speed = lengthVec3(base) || SEEK_SPEED;
    scaleInto(
      pathVelocity,
      pathVelocity.x,
      pathVelocity.y,
      pathVelocity.z,
      speed,
    );
    desires[1].weight = weight;
    count = 2;
  }

  blender.blendRange(desires, count, out);
  return count;
}

/**
 * Applies separation and the speed clamp, then writes the final plan.
 *
 * @param robot - The robot entity.
 * @param mode - The current behavior mode (selects the speed limit).
 * @param neighbors - Nearby robot positions for separation.
 * @param velocity - The blended velocity (modified in place).
 * @param out - Optional plan to overwrite (e.g. a scratch plan whose velocity
 *   vector is the robot's own, so the tick does not allocate).
 * @returns The populated movement plan.
 */
export function finalizePlan(
  robot: RobotEntity,
  mode: RobotBehaviorMode,
  neighbors: readonly Vec3[] | undefined,
  velocity: Vec3,
  out?: MovementPlan,
): MovementPlan {
  applySeparationInto(velocity, robot, neighbors);
  clampVelocityInto(
    velocity,
    mode === RobotBehaviorMode.Retreat ? RETREAT_SPEED : SEEK_SPEED,
  );

  const plan = out ?? { velocity: vec3(), orientation: 0 };
  plan.velocity.x = velocity.x;
  plan.velocity.y = velocity.y;
  plan.velocity.z = velocity.z;
  plan.orientation = computeOrientation(plan.velocity, robot.orientation);
  return plan;
}
