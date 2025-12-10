/**
 * Integration tests for PathfindingSystem
 * @module pathfinding/integration
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';
import type { NavigationMesh } from '@/simulation/ai/pathfinding/types';

describe('PathfindingSystem', () => {
  let system: PathfindingSystem;
  let navMeshResource: NavMeshResource;
  let mockPathComponent: PathComponent;

  beforeEach(() => {
    // Setup mock NavigationMesh with single polygon
    const mockMesh: NavigationMesh = {
      id: 'test-mesh',
      polygons: [
        {
          index: 0,
          vertices: [
            { x: 0, z: 0 },
            { x: 100, z: 0 },
            { x: 100, z: 100 },
            { x: 0, z: 100 },
          ],
          centroid: { x: 50, z: 50 },
          area: 10000,
        },
      ],
      adjacency: new Map(),
      clearanceRadius: 0.95,
      metadata: {
        generatedAt: Date.now(),
        arenaSize: { width: 100, depth: 100 },
        polygonCount: 1,
        memorySize: 1024,
      },
    };

    navMeshResource = new NavMeshResource(mockMesh);

    // Setup mock PathComponent
    mockPathComponent = {
      path: null,
      status: 'pending',
      requestedTarget: { x: 50, y: 0, z: 50 },
      currentWaypointIndex: 0,
      lastCalculationTime: 0,
    };

    system = new PathfindingSystem(navMeshResource);
  });

  it('[T018] calculates path for robot with target', () => {
    const robotPosition = { x: 0, y: 0, z: 0 };
    
    system.calculatePath(robotPosition, mockPathComponent.requestedTarget!, mockPathComponent);
    
    // Path should be calculated
    expect(mockPathComponent.path).not.toBeNull();
    expect(mockPathComponent.status).toBe('valid');
    expect(mockPathComponent.lastCalculationTime).toBeGreaterThan(0);
  });

  it('[T020] path calculation completes within 5ms in 95% of cases', () => {
    const robotPosition = { x: 0, y: 0, z: 0 };
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      system.calculatePath(robotPosition, mockPathComponent.requestedTarget!, mockPathComponent);
      const end = performance.now();
      times.push(end - start);
      
      // Reset for next iteration
      mockPathComponent.status = 'pending';
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
        status: 'pending' as const,
        requestedTarget: { x: i * 5, y: 0, z: i * 5 },
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      },
      position: { x: 0, y: 0, z: 0 },
    }));
    
    const start = performance.now();
    // Execute system for all robots
    for (const robot of robots) {
      system.calculatePath(robot.position, robot.pathComponent.requestedTarget!, robot.pathComponent, robot.id);
    }
    const end = performance.now();
    const executionTime = end - start;
    
    expect(executionTime).toBeLessThan(2.4); // Should complete within 2.4ms
  });
});
