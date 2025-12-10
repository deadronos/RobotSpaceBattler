/**
 * ECS resource for shared navigation mesh instance
 * @module pathfinding/integration
 */

import type NavMesh from 'navmesh';

import type { NavigationMesh, NavigationPath } from '../types';

interface PerformanceMetrics {
  totalPathsCalculated: number;
  averageCalculationTime: number;
  cacheHitRate: number;
  memoryUsageMB: number;
}

/**
 * ECS resource providing shared navigation mesh
 * Supports dynamic mesh updates and performance tracking
 */
export class NavMeshResource {
  private _mesh: NavigationMesh;
  private _meshInstance: NavMesh;
  private _metrics: PerformanceMetrics;
  private _pathCache?: Map<string, NavigationPath>;
  private _calculationTimes: number[] = [];
  private readonly _maxCalculationHistory = 100;

  constructor(mesh: NavigationMesh, meshInstance?: NavMesh) {
    this._mesh = mesh;
    // For tests that don't provide meshInstance
    this._meshInstance = meshInstance || ({} as NavMesh);
    this._metrics = {
      totalPathsCalculated: 0,
      averageCalculationTime: 0,
      cacheHitRate: 0,
      memoryUsageMB: 0,
    };
    this._pathCache = new Map();
  }

  get mesh(): NavigationMesh {
    return this._mesh;
  }

  get meshInstance(): NavMesh {
    return this._meshInstance;
  }

  get metrics(): PerformanceMetrics {
    return { ...this._metrics };
  }

  get pathCache(): Map<string, NavigationPath> | undefined {
    return this._pathCache;
  }

  /**
   * Updates the navigation mesh (e.g., when obstacles change)
   * Invalidates path cache
   */
  updateMesh(newMesh: NavigationMesh, newMeshInstance?: NavMesh): void {
    this._mesh = newMesh;
    if (newMeshInstance) {
      this._meshInstance = newMeshInstance;
    }
    this._pathCache?.clear();
  }

  /**
   * Records a path calculation for metrics tracking
   */
  recordCalculation(calculationTimeMs: number): void {
    this._metrics.totalPathsCalculated++;
    
    // Track calculation times for rolling average
    this._calculationTimes.push(calculationTimeMs);
    if (this._calculationTimes.length > this._maxCalculationHistory) {
      this._calculationTimes.shift();
    }

    // Update average calculation time
    const sum = this._calculationTimes.reduce((acc, time) => acc + time, 0);
    this._metrics.averageCalculationTime = sum / this._calculationTimes.length;

    // Update memory estimate (rough approximation)
    this.updateMemoryUsage();
  }

  /**
   * Updates cache hit rate metric
   */
  updateCacheHitRate(hitRate: number): void {
    this._metrics.cacheHitRate = hitRate;
  }

  /**
   * Returns current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this._metrics };
  }

  /**
   * Estimates memory usage of pathfinding system
   */
  private updateMemoryUsage(): void {
    let totalBytes = 0;

    // Estimate mesh size
    if (this._mesh.polygons) {
      totalBytes += this._mesh.polygons.length * 100; // Rough estimate per polygon
    }

    // Estimate cache size
    if (this._pathCache) {
      for (const path of this._pathCache.values()) {
        totalBytes += path.waypoints.length * 24; // 3 floats * 8 bytes each
      }
    }

    this._metrics.memoryUsageMB = totalBytes / 1024 / 1024;
  }
}

/**
 * Factory function to create a new NavMeshResource
 */
export function createNavMeshResource(
  mesh: NavigationMesh,
  meshInstance: NavMesh,
): NavMeshResource {
  return new NavMeshResource(mesh, meshInstance);
}
