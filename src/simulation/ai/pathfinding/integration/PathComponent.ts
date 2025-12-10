/**
 * ECS component for storing navigation path data
 * @module pathfinding/integration
 */

import type { NavigationPath, Point3D } from '../types';

/**
 * ECS component storing navigation path for a robot entity
 * Attached to robot entities that need pathfinding
 */
export interface PathComponent {
  /**
   * Current navigation path, or null if no path
   */
  path: NavigationPath | null;

  /**
   * Whether path recalculation is needed
   * Set to true when target changes or obstacles move
   */
  needsRecalculation: boolean;

  /**
   * Target position for pathfinding
   */
  targetPosition: Point3D | null;

  /**
   * Last path calculation timestamp (Date.now())
   */
  lastCalculatedAt: number;

  /**
   * Number of path recalculations this frame
   * Used to prevent infinite recalculation loops
   */
  recalculationCount: number;
}

/**
 * Factory function to create a new PathComponent with default values
 */
export function createPathComponent(): PathComponent {
  return {
    path: null,
    needsRecalculation: false,
    targetPosition: null,
    lastCalculatedAt: 0,
    recalculationCount: 0,
  };
}
