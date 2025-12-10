import { describe, it, expect, beforeEach } from 'vitest';
import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import type { PathComponent, PathComponentStatus } from '@/simulation/ai/pathfinding/integration/PathComponent';
import type { NavigationMesh } from '@/simulation/ai/pathfinding/types';

describe('PathfindingSystem Performance', () => {
  let system: PathfindingSystem;
  let navMesh: NavigationMesh;
  let navMeshResource: NavMeshResource;

  beforeEach(() => {
    const generator = new NavMeshGenerator();
    navMesh = generator.generateFromArena({ 
      size: { width: 100, depth: 100 },
      obstacles: []
    });
    navMeshResource = new NavMeshResource(navMesh);
    system = new PathfindingSystem(navMeshResource);
  });

  it('T046: 20 robots calculate paths simultaneously in <16ms total', () => {
    // Arrange: Create 20 robots with path requests
    const robots = Array.from({ length: 20 }, (_, i) => ({
      id: `robot-${i}`,
      position: { x: 10 + i * 2, y: 0, z: 10 },
      pathComponent: {
        status: 'pending' as PathComponentStatus,
        requestedTarget: { x: 80 - i * 2, y: 0, z: 80 },
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      } as PathComponent
    }));

    // Act: Calculate all paths and measure time
    const startTime = performance.now();
    
    robots.forEach(robot => {
      system.calculatePath(
        robot.position,
        robot.pathComponent.requestedTarget!,
        robot.pathComponent
      );
    });
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // Assert: Total time should be <16ms for 60fps (16.67ms frame budget)
    expect(totalTime).toBeLessThan(16);
    
    // Verify all paths were calculated
    const successfulPaths = robots.filter(r => r.pathComponent.status === 'valid').length;
    expect(successfulPaths).toBe(20);
  });

  it('T047: Individual path calculation <5ms in 95% of cases (P95)', () => {
    // Arrange: Generate 100 random path requests to get P95 statistics
    const measurements: number[] = [];
    
    // Act: Calculate 100 paths with random start/end positions
    for (let i = 0; i < 100; i++) {
      const pathComponent: PathComponent = {
        status: 'pending' as PathComponentStatus,
        requestedTarget: { x: Math.random() * 80 + 10, y: 0, z: Math.random() * 80 + 10 },
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      };
      
      const start = { x: Math.random() * 80 + 10, y: 0, z: Math.random() * 80 + 10 };
      
      const startTime = performance.now();
      system.calculatePath(start, pathComponent.requestedTarget!, pathComponent);
      const endTime = performance.now();
      
      measurements.push(endTime - startTime);
    }
    
    // Calculate P95 (95th percentile)
    measurements.sort((a, b) => a - b);
    const p95Index = Math.floor(measurements.length * 0.95);
    const p95Time = measurements[p95Index];
    
    // Assert: P95 should be <5ms
    expect(p95Time).toBeLessThan(5);
  });

  it('T049: Path recalculation on dynamic obstacle completes <100ms', () => {
    // Arrange: Create initial navmesh and 10 robots with existing paths
    const robots = Array.from({ length: 10 }, (_, i) => ({
      id: `robot-${i}`,
      position: { x: 10 + i * 5, y: 0, z: 10 },
      pathComponent: {
        status: 'valid' as PathComponentStatus,
        requestedTarget: { x: 80, y: 0, z: 80 },
        path: {
          waypoints: [
            { x: 10 + i * 5, y: 0, z: 10 },
            { x: 50, y: 0, z: 50 },
            { x: 80, y: 0, z: 80 }
          ],
          totalDistance: 100,
          smoothed: true,
        },
        currentWaypointIndex: 0,
        lastCalculationTime: Date.now(),
      } as PathComponent
    }));

    // Act: Simulate dynamic obstacle (new wall) and recalculate all paths
    const generator = new NavMeshGenerator();
    const newNavMesh = generator.generateFromArena({
      size: { width: 100, depth: 100 },
      obstacles: [{
        type: 'wall' as const,
        polygon: [
          { x: 45, z: 45 },
          { x: 55, z: 45 },
          { x: 55, z: 55 },
          { x: 45, z: 55 }
        ]
      }]
    });
    
    navMeshResource.updateMesh(newNavMesh);
    
    const startTime = performance.now();
    
    robots.forEach(robot => {
      robot.pathComponent.status = 'pending' as PathComponentStatus;
      system.calculatePath(
        robot.position,
        robot.pathComponent.requestedTarget!,
        robot.pathComponent
      );
    });
    
    const endTime = performance.now();
    const recalcTime = endTime - startTime;

    // Assert: Recalculation should complete in <100ms
    expect(recalcTime).toBeLessThan(100);
    
    // Verify paths were recalculated
    const validPaths = robots.filter(r => r.pathComponent.status === 'valid').length;
    expect(validPaths).toBeGreaterThan(0);
  });
});
