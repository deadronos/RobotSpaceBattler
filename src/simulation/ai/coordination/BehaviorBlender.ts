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

import { addVec3, lengthVec3, normalizeVec3, scaleVec3, type Vec3 } from '../../../lib/math/vec3';
import type { MovementDesire, PriorityWeights } from './types';

/**
 * Default priority multipliers for behavior blending.
 * Higher values mean higher priority (more influence on final movement).
 * 
 * Priority order: retreat > combat > pathfinding > idle
 */
const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  retreat: 2.0,     // Highest priority - survival
  combat: 1.5,      // High priority - tactical positioning
  pathfinding: 1.0, // Medium priority - navigation
  idle: 0.5,        // Low priority - default/fallback behavior
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
    // Handle empty input
    if (desires.length === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    // Calculate effective weights and weighted velocities
    let totalWeight = 0;
    let weightedSum: Vec3 = { x: 0, y: 0, z: 0 };

    for (const desire of desires) {
      // Effective weight = base weight * priority multiplier
      const priorityMultiplier = this.priorityWeights[desire.priority];
      const effectiveWeight = desire.weight * priorityMultiplier;
      
      // Add weighted velocity to sum
      const weightedVelocity = scaleVec3(desire.velocity, effectiveWeight);
      weightedSum = addVec3(weightedSum, weightedVelocity);
      
      totalWeight += effectiveWeight;
    }

    // Handle case where all weights are zero
    if (totalWeight === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    // Normalize by total weight to get average weighted direction
    const blended = scaleVec3(weightedSum, 1 / totalWeight);

    // Clamp to max speed
    const magnitude = lengthVec3(blended);
    if (magnitude > MAX_SPEED) {
      const normalized = normalizeVec3(blended);
      return scaleVec3(normalized, MAX_SPEED);
    }

    return blended;
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
