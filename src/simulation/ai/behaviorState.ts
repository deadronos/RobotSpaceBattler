import { RobotEntity, UnitRole } from "../../ecs/world";

const DEFAULT_ENGAGE_DISTANCE = 18;
const DEFAULT_RETREAT_HEALTH_RATIO = 0.3;
const SAFE_ANCHOR_DISTANCE = 4;

/**
 * Enumeration of possible robot behavior modes.
 */
export enum RobotBehaviorMode {
  Seek = "seek",
  Engage = "engage",
  Retreat = "retreat",
}

/**
 * Snapshot of a robot's state relevant to behavior decisions.
 */
export interface RobotBehaviorSnapshot {
  health: number;
  maxHealth: number;
  mode: RobotBehaviorMode;
  role: UnitRole;
}

/**
 * Contextual information for making behavior decisions.
 */
export interface RobotBehaviorContext {
  targetDistance: number | null;
  anchorDistance: number | null;
  rng: () => number;
  threatRadius?: number;
  retreatHealthRatio?: number;
}

/**
 * Determines the next behavior state for a robot based on its current state and context.
 * Implements a state machine transition logic.
 *
 * @param snapshot - The robot's current state snapshot.
 * @param context - The context in which the robot is operating.
 * @returns The next RobotBehaviorMode.
 */
export function nextBehaviorState(
  snapshot: RobotBehaviorSnapshot,
  context: RobotBehaviorContext,
): RobotBehaviorMode {
  let retreatRatio = context.retreatHealthRatio ?? DEFAULT_RETREAT_HEALTH_RATIO;
  let engageDistance = DEFAULT_ENGAGE_DISTANCE;
  let threatRadius = context.threatRadius ?? 12;

  // Role-based behavior overrides
  switch (snapshot.role) {
    case "tank":
      // Tank engages closer, retreats later
      engageDistance = 14;
      retreatRatio = 0.15;
      threatRadius = 10;
      break;
    case "sniper":
      // Sniper engages farther, retreats earlier
      engageDistance = 30;
      retreatRatio = 0.45;
      threatRadius = 20;
      break;
    case "medic":
      // Medic stays back slightly but needs to be close enough to heal
      engageDistance = 16;
      retreatRatio = 0.4;
      threatRadius = 15;
      break;
    default:
      // Assault / Default
      break;
  }

  const currentRatio =
    snapshot.maxHealth > 0 ? snapshot.health / snapshot.maxHealth : 0;

  if (context.targetDistance == null) {
    return RobotBehaviorMode.Seek;
  }

  if (
    snapshot.mode === RobotBehaviorMode.Retreat &&
    context.anchorDistance != null &&
    context.anchorDistance <= SAFE_ANCHOR_DISTANCE
  ) {
    return RobotBehaviorMode.Engage;
  }

  if (currentRatio <= retreatRatio && context.targetDistance <= threatRadius) {
    return RobotBehaviorMode.Retreat;
  }

  if (context.targetDistance < engageDistance) {
    return RobotBehaviorMode.Engage;
  }

  if (Math.abs(context.targetDistance - engageDistance) < 1e-3) {
    return context.rng() >= 0.5
      ? RobotBehaviorMode.Engage
      : RobotBehaviorMode.Seek;
  }

  if (snapshot.mode === RobotBehaviorMode.Retreat) {
    return RobotBehaviorMode.Retreat;
  }

  return RobotBehaviorMode.Seek;
}

/**
 * Helper to get the RobotBehaviorMode enum from a robot entity.
 * @param robot - The robot entity.
 * @returns The RobotBehaviorMode.
 */
export function describeBehavior(robot: RobotEntity): RobotBehaviorMode {
  switch (robot.ai.mode) {
    case "engage":
      return RobotBehaviorMode.Engage;
    case "retreat":
      return RobotBehaviorMode.Retreat;
    default:
      return RobotBehaviorMode.Seek;
  }
}
