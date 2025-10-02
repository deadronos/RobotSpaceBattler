import type { World } from "miniplex";

import type { Entity } from "../../ecs/miniplexStore";
import { performLineOfSight } from "../perception";

/**
 * AI-specific perception helpers that wrap low-level LOS checks
 * with convenient interfaces for decision making.
 */

export interface PerceptionContext {
  world: World<Entity>;
  rapierWorld?: unknown;
}

/**
 * Check if target is visible from self's position within weapon range.
 * Returns false if self has no position.
 */
export function canSeeTarget(
  self: Entity,
  target: Entity | undefined,
  range: number,
  context: PerceptionContext,
): boolean {
  if (!self.position || !target) return false;

  return performLineOfSight(
    self.position,
    target,
    context.world,
    range,
    context.rapierWorld,
  );
}

/**
 * Check if target is within specified range.
 * Returns false if either entity lacks position.
 */
export function isInRange(
  self: Entity,
  target: Entity | undefined,
  range: number,
): boolean {
  if (!self.position || !target?.position) return false;

  const dx = target.position[0] - self.position[0];
  const dz = target.position[2] - self.position[2];
  const distSq = dx * dx + dz * dz;

  return distSq <= range * range;
}

/**
 * Get distance squared between two entities.
 * Returns Infinity if either lacks position.
 */
export function getDistanceSquared(
  self: Entity,
  target: Entity | undefined,
): number {
  if (!self.position || !target?.position) return Infinity;

  const dx = target.position[0] - self.position[0];
  const dz = target.position[2] - self.position[2];
  return dx * dx + dz * dz;
}
