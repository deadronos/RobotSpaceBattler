/**
 * Types for AI behavior coordination and blending
 * @module ai/coordination
 */

import type { Vec3 } from '../../../lib/math/vec3';

/**
 * Priority levels for behavior blending.
 * Higher priority behaviors have more influence on final movement.
 */
export type BehaviorPriority = 'retreat' | 'combat' | 'pathfinding' | 'idle';

/**
 * A movement desire from a specific AI behavior system.
 * Multiple desires are blended to produce final robot movement.
 */
export interface MovementDesire {
  /** Desired velocity vector */
  velocity: Vec3;
  
  /** Priority level of this behavior */
  priority: BehaviorPriority;
  
  /** Weight/strength of this desire (0-1) */
  weight: number;
}

/**
 * Priority multipliers for weighted blending.
 * Default priority order: retreat > combat > pathfinding > idle
 */
export interface PriorityWeights {
  retreat: number;
  combat: number;
  pathfinding: number;
  idle: number;
}
