/**
 * Integration test: Robot navigates around wall cluster (T019)
 * @module integration
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';
import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';
import type { ArenaConfiguration } from '@/simulation/ai/pathfinding/types';
import { ObstacleType } from '@/simulation/ai/pathfinding/types';

describe('PathfindingSystem - Robot Navigation', () => {
  it('[T019] Robot navigates around wall cluster', async () => {
    // Create arena with a wall cluster in the center
    const arenaConfig: ArenaConfiguration = {
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: 'wall-1',
          type: ObstacleType.WALL,
          footprint: [
            { x: 40, z: 40 },
            { x: 60, z: 40 },
            { x: 60, z: 45 },
            { x: 40, z: 45 },
          ],
          height: 2.5,
          passable: false,
        },
        {
          id: 'wall-2',
          type: ObstacleType.WALL,
          footprint: [
            { x: 40, z: 55 },
            { x: 60, z: 55 },
            { x: 60, z: 60 },
            { x: 40, z: 60 },
          ],
          height: 2.5,
          passable: false,
        },
      ],
    };

    // Generate NavMesh
    const generator = new NavMeshGenerator();
    const navMesh = generator.generateFromArena(arenaConfig);
    const navMeshResource = new NavMeshResource(navMesh);

    // Create pathfinding system
    const system = new PathfindingSystem(navMeshResource);

    // Robot starts on left side, target on right side (requires navigating around walls)
    const robotPosition = { x: 10, y: 0, z: 50 };
    const targetPosition = { x: 90, y: 0, z: 50 };

    // Create path component
    const pathComponent: PathComponent = {
      path: null,
      status: 'pending',
      requestedTarget: targetPosition,
      currentWaypointIndex: 0,
      lastCalculationTime: 0,
    };

    // Calculate path
    await system.calculatePath(robotPosition, pathComponent, 'test-robot');

    // Verify path was found
    expect(pathComponent.path).not.toBeNull();
    expect(pathComponent.status).toBe('valid');

    if (pathComponent.path) {
      // Path should have at least 2 waypoints (start and end)
      expect(pathComponent.path.waypoints.length).toBeGreaterThanOrEqual(2);

      // Path should reach near the target
      const lastWaypoint =
        pathComponent.path.waypoints[pathComponent.path.waypoints.length - 1];
      const distanceToTarget = Math.sqrt(
        Math.pow(lastWaypoint.x - targetPosition.x, 2) +
          Math.pow(lastWaypoint.z - targetPosition.z, 2),
      );
      expect(distanceToTarget).toBeLessThan(10); // Within 10 units of target

      // Verify path is valid (waypoints exist and are numbers)
      for (const waypoint of pathComponent.path.waypoints) {
        expect(waypoint.x).toBeTypeOf('number');
        expect(waypoint.y).toBeTypeOf('number');
        expect(waypoint.z).toBeTypeOf('number');
      }

      // Path length should be reasonable (not infinite or negative)
      if (pathComponent.path.totalDistance) {
        expect(pathComponent.path.totalDistance).toBeGreaterThan(0);
        expect(pathComponent.path.totalDistance).toBeLessThan(200); // Max diagonal
      }
    }
  });
});
