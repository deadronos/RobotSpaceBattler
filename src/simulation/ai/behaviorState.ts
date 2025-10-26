export enum RobotBehaviorMode {
  Seek = "seek",
  Engage = "engage",
  Retreat = "retreat",
}

export interface BehaviorThresholds {
  engageDistance: number;
  retreatDistance: number;
  retreatHealthFraction: number;
  anchorReleaseDistance: number;
}

const DEFAULT_THRESHOLDS: BehaviorThresholds = {
  engageDistance: 18,
  retreatDistance: 12,
  retreatHealthFraction: 0.3,
  anchorReleaseDistance: 4,
};

const EPSILON = 1e-6;

export interface RobotBehaviorSnapshot {
  health: number;
  maxHealth: number;
  mode: RobotBehaviorMode;
}

export interface RobotBehaviorContext {
  targetDistance: number | null;
  anchorDistance: number;
  rng?: () => number;
  thresholds?: Partial<BehaviorThresholds>;
}

export function nextBehaviorState(
  snapshot: RobotBehaviorSnapshot,
  context: RobotBehaviorContext,
): RobotBehaviorMode {
  const thresholds: BehaviorThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...context.thresholds,
  };
  const rng = context.rng ?? (() => 0.5);

  if (snapshot.health <= 0 || context.targetDistance === null) {
    return RobotBehaviorMode.Seek;
  }

  const shouldRetreat =
    snapshot.health < snapshot.maxHealth * thresholds.retreatHealthFraction &&
    context.targetDistance < thresholds.retreatDistance;

  if (shouldRetreat) {
    if (context.anchorDistance < thresholds.anchorReleaseDistance) {
      return RobotBehaviorMode.Engage;
    }

    return RobotBehaviorMode.Retreat;
  }

  if (context.targetDistance < thresholds.engageDistance) {
    return RobotBehaviorMode.Engage;
  }

  if (Math.abs(context.targetDistance - thresholds.engageDistance) <= EPSILON) {
    return rng() >= 0.5 ? RobotBehaviorMode.Engage : RobotBehaviorMode.Seek;
  }

  return RobotBehaviorMode.Seek;
}
