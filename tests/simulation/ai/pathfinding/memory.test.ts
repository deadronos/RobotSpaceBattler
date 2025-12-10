import { describe, it, expect, beforeEach } from 'vitest';
import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';

describe('PathfindingSystem Memory', () => {
  let system: PathfindingSystem;
  let navMeshResource: NavMeshResource;

  beforeEach(() => {
    const generator = new NavMeshGenerator();
    const navMesh = generator.generateFromArena({ 
      size: { width: 100, depth: 100 },
      obstacles: []
    });
    navMeshResource = new NavMeshResource(navMesh);
    system = new PathfindingSystem(navMeshResource);
  });

  it('T048: Total pathfinding memory usage <5MB sustained', () => {
    // Arrange: Calculate baseline memory before pathfinding operations
    const getMemoryUsage = () => {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed / 1024 / 1024; // MB
      }
      // Browser environment - use performance.memory if available
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      return 0;
    };

    // Force garbage collection if available (Node.js with --expose-gc flag)
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
    }

    const baselineMemory = getMemoryUsage();
    
    // Act: Perform sustained pathfinding operations
    // Create 100 robots and calculate paths 10 times each (1000 total calculations)
    const robots = Array.from({ length: 100 }, (_, i) => ({
      position: { x: 10 + i % 10 * 8, y: 0, z: 10 + Math.floor(i / 10) * 8 },
      pathComponent: {
        status: 'pending' as const,
        requestedTarget: { x: 0, y: 0, z: 0 },
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      }
    }));

    // Simulate sustained load
    for (let cycle = 0; cycle < 10; cycle++) {
      robots.forEach((robot, i) => {
        robot.pathComponent.requestedTarget = {
          x: 80 - (i % 10) * 8,
          y: 0,
          z: 80 - Math.floor(i / 10) * 8
        };
        system.calculatePath(
          robot.position,
          robot.pathComponent.requestedTarget,
          robot.pathComponent
        );
      });
    }

    // Measure memory after operations
    const afterMemory = getMemoryUsage();
    const memoryIncrease = afterMemory - baselineMemory;

    // Assert: Memory increase should be <5MB
    expect(memoryIncrease).toBeLessThan(5);

    // Additional check: NavMeshResource should track memory usage
    const metrics = navMeshResource.getMetrics();
    expect(metrics.memoryUsageBytes).toBeDefined();
    // Memory usage in bytes should be less than 5MB
    expect(metrics.memoryUsageBytes).toBeLessThan(5 * 1024 * 1024);
  });
});
