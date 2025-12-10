/**
 * ECS resource for shared navigation mesh instance
 * @module pathfinding/integration
 */

import type NavMesh from 'navmesh';

import type { NavigationMesh, NavigationPath } from '../types';

/**
 * ECS resource providing shared navigation mesh
 * Single instance per arena, shared by all pathfinding queries
 */
export interface NavMeshResource {
  /**
   * The navigation mesh data structure
   */
  readonly mesh: NavigationMesh;

  /**
   * NavMesh library instance for pathfinding queries
   * From 'navmesh' npm package
   */
  readonly meshInstance: NavMesh;

  /**
   * Performance metrics for monitoring
   */
  metrics: {
    totalPathsCalculated: number;
    averageCalculationTime: number;
    cacheHitRate: number;
  };

  /**
   * Optional path cache for frequently-requested routes
   * Key format: "startX,startZ,endX,endZ"
   */
  pathCache?: Map<string, NavigationPath>;
}

/**
 * Factory function to create a new NavMeshResource
 */
export function createNavMeshResource(
  mesh: NavigationMesh,
  meshInstance: NavMesh,
): NavMeshResource {
  return {
    mesh,
    meshInstance,
    metrics: {
      totalPathsCalculated: 0,
      averageCalculationTime: 0,
      cacheHitRate: 0,
    },
    pathCache: new Map(),
  };
}
