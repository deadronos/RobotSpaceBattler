import { RobotEntity } from "../../ecs/world";

const DEFAULT_ENGAGE_DISTANCE = 18;
const DEFAULT_RETREAT_HEALTH_RATIO = 0.3;
const SAFE_ANCHOR_DISTANCE = 4;

export enum RobotBehaviorMode {
  Seek = "seek",
  Engage = "engage",
  Retreat = "retreat",
}

export interface RobotBehaviorSnapshot {
  health: number;
  maxHealth: number;
  mode: RobotBehaviorMode;
}

export interface RobotBehaviorContext {
  targetDistance: number | null;
  anchorDistance: number | null;
  rng: () => number;
  threatRadius?: number;
  retreatHealthRatio?: number;
}

export function nextBehaviorState(
  snapshot: RobotBehaviorSnapshot,
  context: RobotBehaviorContext,
): RobotBehaviorMode {
  const retreatRatio =
    context.retreatHealthRatio ?? DEFAULT_RETREAT_HEALTH_RATIO;
  const threatRadius = context.threatRadius ?? 12;
  const currentRatio =
    snapshot.maxHealth > 0 ? snapshot.health / snapshot.maxHealth : 0;
  const engageDistance = DEFAULT_ENGAGE_DISTANCE;

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
