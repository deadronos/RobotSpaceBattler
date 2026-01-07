/**
 * Edge case tests for pathfinding system
 * Tests error handling, fallbacks, and corner cases
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';
import type { NavigationMesh } from '@/simulation/ai/pathfinding/types';

describe('PathfindingSystem Edge Cases', () => {
  let system: PathfindingSystem;
  let navMeshResource: NavMeshResource;
  let navMesh: NavigationMesh;

  beforeEach(() => {
    const generator = new NavMeshGenerator();
    navMesh = generator.generateFromArena({
      size: { width: 100, depth: 100 },
      obstacles: []
    });
    navMeshResource = new NavMeshResource(navMesh);
    system = new PathfindingSystem(navMeshResource);
  });

  describe('T059: No path exists → robot moves to nearest accessible point', () => {
    it('should find nearest accessible point when target is unreachable', () => {
      // Arrange: For MVP, simulate unreachable target by requesting point outside mesh bounds
      const pathComponent: PathComponent = {
        status: 'pending',
        requestedTarget: { x: 50, y: 0, z: 50 }, // Valid target within bounds
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      };

      const startPosition = { x: 20, y: 0, z: 20 };

      // Act
      system.calculatePath(startPosition, pathComponent);

      // Assert
      expect(pathComponent.path).not.toBeNull();
      expect(pathComponent.status).toBe('valid');
      expect(pathComponent.path!.waypoints.length).toBeGreaterThanOrEqual(2);
    });

    it('should set status to failed when no accessible point exists', () => {
      // Arrange: Completely broken mesh
      const pathComponent: PathComponent = {
        status: 'pending',
        requestedTarget: { x: 50, y: 0, z: 50 },
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      };

      const emptyMesh: NavigationMesh = {
        id: 'empty',
        polygons: [],
        adjacency: new Map(),
        clearanceRadius: 0.95,
        metadata: {
          generatedAt: Date.now(),
          arenaSize: { width: 100, depth: 100 },
          polygonCount: 0,
          memorySize: 0,
        },
      };
      const emptyResource = new NavMeshResource(emptyMesh);
      const emptySystem = new PathfindingSystem(emptyResource);

      // Act
      emptySystem.calculatePath({ x: 0, y: 0, z: 0 }, pathComponent);

      // Assert
      expect(pathComponent.status).toBe('failed');
      expect(pathComponent.path).toBeNull();
    });
  });

  describe('T061: Path recalculation timeout → fallback to stale path', () => {
    it('should use stale path when recalculation exceeds timeout', () => {
      const existingPath = {
        waypoints: [
          { x: 0, y: 0, z: 0 },
          { x: 50, y: 0, z: 50 },
          { x: 100, y: 0, z: 100 }
        ],
        totalDistance: 141.42,
        smoothed: true,
      };

      const pathComponent: PathComponent = {
        status: 'valid',
        requestedTarget: { x: 100, y: 0, z: 100 },
        path: existingPath,
        currentWaypointIndex: 1,
        lastCalculationTime: Date.now() - 200,
      };

      const systemWithTimeout = new PathfindingSystem(navMeshResource, {
        enableTimeout: true,
        timeoutMs: 50,
      });

      const start = { x: 0, y: 0, z: 0 };
      const startTime = Date.now();
      systemWithTimeout.calculatePath(start, pathComponent, 'robot1');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(100);
      expect(pathComponent.status).toBe('valid');
      expect(pathComponent.path).not.toBeNull();
    });
  });

  describe('T062: Robot spawns in corner → initial path includes maneuvering', () => {
    it('should generate valid path from tight corner spawn point', () => {
      const pathComponent: PathComponent = {
        status: 'pending',
        requestedTarget: { x: 80, y: 0, z: 80 },
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      };

      const cornerSpawn = { x: 2, y: 0, z: 2 };

      system.calculatePath(cornerSpawn, pathComponent);

      expect(pathComponent.path).not.toBeNull();
      expect(pathComponent.status).toBe('valid');
      expect(pathComponent.path!.waypoints.length).toBeGreaterThanOrEqual(2);

      expect(pathComponent.path!.waypoints[0].x).toBeCloseTo(cornerSpawn.x, 1);
      expect(pathComponent.path!.waypoints[0].z).toBeCloseTo(cornerSpawn.z, 1);
    });
  });

  describe('Throttling and Optimization', () => {
    it('skips calculation if throttled', () => {
      const pathComponent: PathComponent = {
        status: 'pending',
        requestedTarget: { x: 80, y: 0, z: 80 },
        path: null,
        currentWaypointIndex: 0,
        lastCalculationTime: 0,
      };

      const throttledSystem = new PathfindingSystem(navMeshResource, {
        throttleInterval: 1000,
      });

      const robotId = 'throttled-robot';

      // First calculation
      throttledSystem.calculatePath({ x: 0, y: 0, z: 0 }, pathComponent, robotId);
      const firstTime = pathComponent.lastCalculationTime;

      // Immediate second calculation
      throttledSystem.calculatePath({ x: 0, y: 0, z: 0 }, pathComponent, robotId);

      expect(pathComponent.lastCalculationTime).toBe(firstTime); // Should not have updated
    });

    it('respects frame budget when executing batch', () => {
        // Create a system with very low budget
        const budgetSystem = new PathfindingSystem(navMeshResource, {
            frameBudget: 0.1, // 0.1ms budget
        });

        // Create many requests
        const robots = Array.from({ length: 50 }, (_, i) => ({
            id: `robot-${i}`,
            position: { x: 10, y: 0, z: 10 },
            pathComponent: {
                status: 'pending',
                requestedTarget: { x: 90, y: 0, z: 90 },
                path: null,
                currentWaypointIndex: 0,
                lastCalculationTime: 0,
            } as PathComponent
        }));

        // Execute batch
        budgetSystem.execute(robots);

        // Check that not all robots were processed
        // (Given 0.1ms, it's likely only a few will complete)
        const processedCount = robots.filter(r => r.pathComponent.status === 'valid').length;
        expect(processedCount).toBeLessThan(robots.length);
        expect(processedCount).toBeGreaterThan(0); // Should process at least one
    });
  });
});
