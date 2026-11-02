import type { RobotEntity } from "../../../ecs/world";
import { Vec3, vec3 } from "../../../lib/math/vec3";
import { RobotBehaviorMode } from "../behaviorState";
import { resolveSpawnCenter } from "./helpers";
import { computeNavDesire } from "./navDesire";
import { blendDesires, computeBaseDesire, finalizePlan } from "./steering";
import type { MovementContext, MovementPlan } from "./types";

// Prefer Vite's import.meta.env for web builds, fallback to process.env in Node
const viteEnv = (import.meta as unknown as { env?: Record<string, string> })
  .env;
const DEBUG_AI = Boolean(
  viteEnv?.VITE_DEBUG_AI ??
  (typeof process !== "undefined" && process.env?.DEBUG_AI),
);

// Per-tick scratch state, reused so the movement plan does not allocate.
const desiredVelocityScratch = vec3();

/**
 * Plans the movement for a robot based on its behavior mode, target, and environment.
 * Combines steering behaviors: seeking, strafing, separation, and avoidance.
 *
 * The plan is computed with in-place scratch vectors; pass `out` to also write
 * the result into a reusable plan (for example one whose velocity vector is the
 * robot's own) and keep the AI tick allocation free.
 *
 * @param robot - The robot entity.
 * @param mode - The current behavior mode (Seek, Engage, Retreat).
 * @param target - The current target robot (if any).
 * @param context - Movement context (per-match team configs, spawn override,
 *   neighbors, anchors, physics).
 * @param out - Optional reusable plan to overwrite.
 * @returns A MovementPlan containing the desired velocity and orientation.
 */
export function planRobotMovement(
  robot: RobotEntity,
  mode: RobotBehaviorMode,
  target: RobotEntity | undefined,
  context: MovementContext,
  out?: MovementPlan,
): MovementPlan {
  const spawnCenter = resolveSpawnCenter(robot, context);
  const strafeSign = context.strafeSign ?? robot.ai.strafeSign ?? 1;
  const formationAnchor =
    context.formationAnchor ?? robot.ai.anchorPosition ?? null;

  // 1. NAVMESH DESIRE CHECKS (line of sight, movement blocking, waypoint)
  const nav = computeNavDesire(robot, target, context.obstacles);

  // 2. BASE MOVEMENT DESIRE (Combat/Seeking)
  computeBaseDesire(
    robot,
    mode,
    target,
    spawnCenter,
    context.formationAnchor,
    formationAnchor,
    strafeSign,
  );

  // 3. BLEND DESIRES
  const desiredVelocity = desiredVelocityScratch;
  const desireCount = blendDesires(
    robot,
    nav.waypoint,
    nav.weight,
    desiredVelocity,
  );

  if (DEBUG_AI) {
    console.log("planRobotMovement", {
      robot: robot.id,
      target: target?.id,
      pathBlocked: nav.pathBlocked,
      needsPathfinding: nav.needsPathfinding,
      desires: desireCount,
    });
  }

  robot.ai.blockedFrames = nav.pathBlocked
    ? (robot.ai.blockedFrames ?? 0) + 1
    : 0;

  if (robot.ai.blockedFrames && robot.ai.blockedFrames >= 3) {
    desiredVelocity.x = 0;
    desiredVelocity.y = 0;
    desiredVelocity.z = 0;
  }

  return finalizePlan(robot, mode, context.neighbors, desiredVelocity, out);
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
  return {
    x: position.x + velocity.x * deltaSeconds,
    y: position.y + velocity.y * deltaSeconds,
    z: position.z + velocity.z * deltaSeconds,
  };
}

export { resolveSpawnCenter } from "./helpers";
