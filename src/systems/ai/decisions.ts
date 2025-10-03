import type { Entity } from "../../ecs/miniplexStore";
import type { AIState } from "../AISystem";

/**
 * Pure functions for AI decision making.
 * These are stateless and testable without world/physics dependencies.
 */

export interface AIContext {
  now: number;
  hp: number;
  maxHp: number;
  weaponRange: number;
  speed: number;
}

export interface AIDecision {
  nextState?: AIState;
  stateSince?: number;
  targetId?: number | undefined;
  shouldFire?: boolean;
  velocity?: { x: number; y: number; z: number };
}

/**
 * Determine if entity should flee based on health.
 */
export function shouldFlee(hp: number, maxHp: number): boolean {
  return hp < maxHp * 0.25;
}

/**
 * Determine if entity should stop fleeing (health recovered).
 */
export function shouldStopFleeing(hp: number, maxHp: number): boolean {
  return hp > maxHp * 0.5;
}

/**
 * Calculate backing-off velocity when too close to target.
 */
export function calculateBackOffVelocity(
  selfPos: [number, number, number],
  targetPos: [number, number, number],
  speed: number,
): { x: number; y: number; z: number } {
  const dx = selfPos[0] - targetPos[0];
  const dz = selfPos[2] - targetPos[2];
  const dist = Math.hypot(dx, dz) || 1;

  return {
    x: (dx / dist) * speed,
    y: 0,
    z: (dz / dist) * speed,
  };
}

/**
 * Calculate flee velocity away from target.
 */
export function calculateFleeVelocity(
  selfPos: [number, number, number],
  targetPos: [number, number, number] | undefined,
  speed: number,
  rng: () => number,
): { x: number; y: number; z: number } {
  if (targetPos) {
    return calculateBackOffVelocity(selfPos, targetPos, speed);
  }

  // Random flee direction if no target
  const angle = rng() * Math.PI * 2;
  return {
    x: Math.cos(angle) * speed,
    y: 0,
    z: Math.sin(angle) * speed,
  };
}

/**
 * Calculate patrol/wander velocity.
 */
export function calculateWanderVelocity(
  speed: number,
  rng: () => number,
  multiplier = 0.5,
): { x: number; y: number; z: number } {
  const angle = rng() * Math.PI * 2;
  return {
    x: Math.cos(angle) * (speed * multiplier),
    y: 0,
    z: Math.sin(angle) * (speed * multiplier),
  };
}

/**
 * Check if entity is too close to target and should back off.
 */
export function isTooClose(
  selfPos: [number, number, number],
  targetPos: [number, number, number],
  weaponRange: number,
): boolean {
  const dx = targetPos[0] - selfPos[0];
  const dz = targetPos[2] - selfPos[2];
  const dist = Math.hypot(dx, dz);

  return dist < weaponRange * 0.5;
}

/**
 * Decide idle state transitions.
 */
export function decideIdleAction(
  context: AIContext,
  hasTarget: boolean,
  hasLOS: boolean,
  target: Entity | undefined,
  currentStateSince: number,
  rng: () => number,
): AIDecision {
  // Check for engagement opportunity
  if (hasTarget && hasLOS && target) {
    return {
      nextState: "engage",
      stateSince: context.now,
      targetId: target.id as number,
    };
  }

  // Randomly switch to patrol
  if (rng() < 0.02) {
    return {
      nextState: "patrol",
      stateSince: context.now,
    };
  }

  return {};
}

/**
 * Decide patrol state transitions and actions.
 */
export function decidePatrolAction(
  context: AIContext,
  hasTarget: boolean,
  hasLOS: boolean,
  target: Entity | undefined,
  currentStateSince: number,
  rng: () => number,
): AIDecision {
  // Check for engagement opportunity
  if (hasTarget && hasLOS && target) {
    return {
      nextState: "engage",
      stateSince: context.now,
      targetId: target.id as number,
    };
  }

  // Revert to idle after duration
  if (context.now - currentStateSince > 3000) {
    return {
      nextState: "idle",
      stateSince: context.now,
    };
  }

  // Continue patrolling
  return {
    velocity: calculateWanderVelocity(context.speed, rng, 0.5),
  };
}

/**
 * Decide engage state transitions and actions.
 */
export function decideEngageAction(
  context: AIContext,
  hasTarget: boolean,
  hasLOS: boolean,
  target: Entity | undefined,
  selfPos: [number, number, number],
  rng: () => number,
): AIDecision {
  // Lost target
  if (!hasTarget || !target) {
    return {
      nextState: "idle",
      stateSince: context.now,
      shouldFire: false,
      targetId: undefined,
    };
  }

  // Lost line of sight
  if (!hasLOS) {
    return {
      shouldFire: false,
      targetId: undefined,
      velocity: calculateWanderVelocity(context.speed, rng, 0.6),
    };
  }

  // Has target and LOS - engage
  const decision: AIDecision = {
    targetId: target.id as number,
    shouldFire: true,
  };

  // Back off if too close
  if (
    target.position &&
    isTooClose(selfPos, target.position, context.weaponRange)
  ) {
    decision.velocity = calculateBackOffVelocity(
      selfPos,
      target.position,
      context.speed,
    );
  }

  return decision;
}

/**
 * Decide flee state transitions and actions.
 */
export function decideFleeAction(
  context: AIContext,
  target: Entity | undefined,
  selfPos: [number, number, number],
  rng: () => number,
): AIDecision {
  // Stop fleeing if health recovered
  if (shouldStopFleeing(context.hp, context.maxHp)) {
    return {
      nextState: "idle",
      stateSince: context.now,
    };
  }

  // Continue fleeing
  return {
    shouldFire: false,
    velocity: calculateFleeVelocity(
      selfPos,
      target?.position,
      context.speed,
      rng,
    ),
  };
}
