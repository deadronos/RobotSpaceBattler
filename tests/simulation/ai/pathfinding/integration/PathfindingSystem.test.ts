/**
 * Integration tests for PathfindingSystem
 * @module pathfinding/integration
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';
import type { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';

describe('PathfindingSystem', () => {
  let system: PathfindingSystem;
  let mockNavMeshResource: NavMeshResource;
  let mockPathComponent: PathComponent;

  beforeEach(() => {
    // Setup mock NavMeshResource
    mockNavMeshResource = {
      mesh: {
        id: 'test-mesh',
        polygons: [],
        adjacency: new Map(),
        clearanceRadius: 0.95,
        metadata: {
          generatedAt: Date.now(),
          arenaSize: { width: 100, depth: 100 },
          polygonCount: 0,
          memorySize: 1024,
        },
      },
      meshInstance: {} as any, // Mock NavMesh instance
      metrics: {
        totalPathsCalculated: 0,
        averageCalculationTime: 0,
        cacheHitRate: 0,
      },
    };

    // Setup mock PathComponent
    mockPathComponent = {
      path: null,
      needsRecalculation: true,
      targetPosition: { x: 50, y: 0, z: 50 },
      lastCalculatedAt: 0,
      recalculationCount: 0,
    };

    system = new PathfindingSystem(mockNavMeshResource);
  });

  it('[T018] calculates path for robot with target', () => {
    const robotPosition = { x: 0, y: 0, z: 0 };
    
    system.calculatePath(mockPathComponent, robotPosition);
    
    // Path should be calculated
    expect(mockPathComponent.path).not.toBeNull();
    expect(mockPathComponent.needsRecalculation).toBe(false);
    expect(mockPathComponent.lastCalculatedAt).toBeGreaterThan(0);
  });

  it('[T020] path calculation completes within 5ms in 95% of cases', () => {
    const robotPosition = { x: 0, y: 0, z: 0 };
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      system.calculatePath(mockPathComponent, robotPosition);
      const end = performance.now();
      times.push(end - start);
      
      // Reset for next iteration
      mockPathComponent.needsRecalculation = true;
      mockPathComponent.path = null;
    }
    
    // Sort times to find P95
    times.sort((a, b) => a - b);
    const p95Index = Math.floor(iterations * 0.95);
    const p95Time = times[p95Index];
    
    expect(p95Time).toBeLessThan(5); // P95 should be < 5ms
  });

  it('[T021] system execution completes within 2.4ms with 20 robots', () => {
    // Create 20 mock robot entities with path components
    const robots = Array.from({ length: 20 }, (_, i) => ({
      id: `robot-${i}`,
      pathComponent: {
        path: null,
        needsRecalculation: true,
        targetPosition: { x: i * 5, y: 0, z: i * 5 },
        lastCalculatedAt: 0,
        recalculationCount: 0,
      },
      position: { x: 0, y: 0, z: 0 },
    }));
    
    const start = performance.now();
    // Execute system for all robots
    for (const robot of robots) {
      system.calculatePath(robot.pathComponent, robot.position);
    }
    const end = performance.now();
    const executionTime = end - start;
    
    expect(executionTime).toBeLessThan(2.4); // Should complete within 2.4ms
  });
});
