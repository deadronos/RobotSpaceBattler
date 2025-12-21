/**
 * ECS component for storing navigation path data
 * @module pathfinding/integration
 */

import type { NavigationPath, Point3D } from "../types";

/**
 * Path calculation status
 */
export type PathComponentStatus = "pending" | "valid" | "invalid" | "failed";

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
   * Current path status
   */
  status: PathComponentStatus;

  /**
   * Target position for current path request
   */
  requestedTarget: Point3D | null;

  /**
   * Current waypoint index for path following
   */
  currentWaypointIndex: number;

  /**
   * Last path calculation timestamp (Date.now())
   */
  lastCalculationTime: number;

  // Legacy fields for backward compatibility
  needsRecalculation?: boolean;
  targetPosition?: Point3D | null;
  lastCalculatedAt?: number;
  recalculationCount?: number;
}

/**
 * Factory function to create a new PathComponent with default values
 */
export function createPathComponent(): PathComponent {
  return {
    path: null,
    status: "pending",
    requestedTarget: null,
    currentWaypointIndex: 0,
    lastCalculationTime: 0,
    needsRecalculation: false,
    targetPosition: null,
    lastCalculatedAt: 0,
    recalculationCount: 0,
  };
}
