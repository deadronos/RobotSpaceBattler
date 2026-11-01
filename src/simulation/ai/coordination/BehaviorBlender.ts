/**
 * BehaviorBlender - Blends multiple AI behavior desires into single movement output
 *
 * T074: Integrate pathfinding desire with existing AI behavior blending system
 * T075: Define weighted blending priorities (retreat > combat > pathfinding > idle)
 * T076: Integration test: Pathfinding blends correctly with combat behavior
 *
 * Phase 8 - Integration & AI Behavior Coordination
 *
 * @module ai/coordination
 */

import type { Vec3 } from "../../../lib/math/vec3";
import type { MovementDesire, PriorityWeights } from "./types";

/**
 * Default priority multipliers for behavior blending.
 * Higher values mean higher priority (more influence on final movement).
 *
 * Priority order: retreat > combat > pathfinding > idle
 */
const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  retreat: 2.0, // Highest priority - survival
  combat: 1.5, // High priority - tactical positioning
  pathfinding: 1.0, // Medium priority - navigation
  idle: 0.5, // Low priority - default/fallback behavior
};

/** Maximum blended velocity magnitude */
const MAX_SPEED = 10.0;

/**
 * Blends multiple AI behavior movement desires into a single output velocity.
 *
 * Uses weighted additive blending where each desire contributes proportionally
 * to its priority and weight. Higher priority behaviors have more influence.
 *
 * @example
 * ```typescript
 * const blender = new BehaviorBlender();
 *
 * const desires: MovementDesire[] = [
 *   { velocity: {x:1, y:0, z:0}, priority: 'pathfinding', weight: 0.5 },
 *   { velocity: {x:0, y:0, z:1}, priority: 'combat', weight: 0.8 }
 * ];
 *
 * const blended = blender.blend(desires); // Combines both with priority weighting
 * ```
 */
export class BehaviorBlender {
  private priorityWeights: PriorityWeights;

  /**
   * Creates a new BehaviorBlender with optional custom priority weights.
   *
   * @param priorityWeights - Custom priority multipliers (optional)
   */
  constructor(priorityWeights?: PriorityWeights) {
    this.priorityWeights = priorityWeights ?? DEFAULT_PRIORITY_WEIGHTS;
  }

  /**
   * Blends multiple movement desires into a single output velocity.
   *
   * Algorithm:
   * 1. Calculate effective weight for each desire: baseWeight * priorityMultiplier
   * 2. Weight each velocity vector by its effective weight
   * 3. Sum all weighted vectors
   * 4. Normalize the result
   * 5. Clamp to MAX_SPEED
   *
   * @param desires - Array of movement desires from different AI behaviors
   * @returns Blended velocity vector
   */
  blend(desires: MovementDesire[]): Vec3 {
    return this.blendRange(desires, desires.length, { x: 0, y: 0, z: 0 });
  }

  /**
   * Blends the first `count` desires into `out`, without allocating.
   *
   * Hot path for the AI tick: `blend` is kept as an allocating wrapper so
   * callers that want a fresh vector keep that contract.
   *
   * @param desires - Array of movement desires (may be a reused scratch array).
   * @param count - Number of entries of `desires` to read.
   * @param out - The vector to overwrite with the blended velocity.
   * @returns `out`.
   */
  blendRange(
    desires: readonly MovementDesire[],
    count: number,
    out: Vec3,
  ): Vec3 {
    // Handle empty input
    if (count === 0) {
      out.x = 0;
      out.y = 0;
      out.z = 0;
      return out;
    }

    // Calculate effective weights and weighted velocities
    let totalWeight = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (let i = 0; i < count; i += 1) {
      const desire = desires[i];
      // Effective weight = base weight * priority multiplier
      const priorityMultiplier = this.priorityWeights[desire.priority];
      const effectiveWeight = desire.weight * priorityMultiplier;

      sumX += desire.velocity.x * effectiveWeight;
      sumY += desire.velocity.y * effectiveWeight;
      sumZ += desire.velocity.z * effectiveWeight;
      totalWeight += effectiveWeight;
    }

    // Handle case where all weights are zero
    if (totalWeight === 0) {
      out.x = 0;
      out.y = 0;
      out.z = 0;
      return out;
    }

    // Normalize by total weight to get average weighted direction
    const inverse = 1 / totalWeight;
    const blendedX = sumX * inverse;
    const blendedY = sumY * inverse;
    const blendedZ = sumZ * inverse;

    // Clamp to max speed
    const magnitude = Math.sqrt(
      blendedX * blendedX + blendedY * blendedY + blendedZ * blendedZ,
    );
    if (magnitude > MAX_SPEED) {
      const normalizeScale = 1 / magnitude;
      out.x = blendedX * normalizeScale * MAX_SPEED;
      out.y = blendedY * normalizeScale * MAX_SPEED;
      out.z = blendedZ * normalizeScale * MAX_SPEED;
      return out;
    }

    out.x = blendedX;
    out.y = blendedY;
    out.z = blendedZ;
    return out;
  }

  /**
   * Gets the current priority weights configuration.
   *
   * @returns Current priority multipliers
   */
  getPriorityWeights(): Readonly<PriorityWeights> {
    return { ...this.priorityWeights };
  }
}
