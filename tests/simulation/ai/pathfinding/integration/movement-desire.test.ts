/**
 * T072: PathfindingSystem outputs movement desire vector (not direct position update)
 * Phase 8 TDD RED - Integration & AI Behavior Coordination
 * 
 * Tests verify that pathfinding emits movement desires rather than directly modifying position.
 * @module pathfinding/integration
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';
import type { NavigationMesh } from '@/simulation/ai/pathfinding/types';
import type { Point3D } from '@/simulation/ai/pathfinding/types';

describe('PathfindingSystem Movement Desire Output', () => {
  let system: PathfindingSystem;
  let navMeshResource: NavMeshResource;
  let mockPathComponent: PathComponent;
  let mockRobotPosition: Point3D;

  beforeEach(() => {
    // Setup mock NavigationMesh
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
    system = new PathfindingSystem(navMeshResource);

    mockRobotPosition = { x: 10, y: 0, z: 10 };
    mockPathComponent = {
      path: null,
      status: 'pending',
      requestedTarget: { x: 90, y: 0, z: 90 },
      currentWaypointIndex: 0,
      lastCalculationTime: 0,
    };
  });

  it('T072: should output movement desire vector from path calculation', () => {
    // Act: Calculate path
    system.calculatePath(mockRobotPosition, mockPathComponent);

    // Assert: PathComponent should contain navigation path
    expect(mockPathComponent.path).not.toBeNull();
    expect(mockPathComponent.status).toBe('valid');

    // Path provides waypoints that represent desired movement direction
    const path = mockPathComponent.path!;
    expect(path.waypoints.length).toBeGreaterThanOrEqual(2);

    // First waypoint should be near start position
    const firstWaypoint = path.waypoints[0];
    expect(firstWaypoint.x).toBeCloseTo(mockRobotPosition.x, 1);
    expect(firstWaypoint.z).toBeCloseTo(mockRobotPosition.z, 1);
  });

  it('T072: should NOT directly modify robot position in calculatePath', () => {
    // Arrange: Store original position
    const originalPosition = { ...mockRobotPosition };

    // Act: Calculate path
    system.calculatePath(mockRobotPosition, mockPathComponent);

    // Assert: Robot position should be unchanged (system doesn't modify it)
    expect(mockRobotPosition.x).toBe(originalPosition.x);
    expect(mockRobotPosition.y).toBe(originalPosition.y);
    expect(mockRobotPosition.z).toBe(originalPosition.z);
  });

  it('T072: path waypoints should represent directional desires for movement', () => {
    // Act
    system.calculatePath(mockRobotPosition, mockPathComponent);

    // Assert: Waypoints progress toward target
    const path = mockPathComponent.path!;
    expect(path.waypoints.length).toBeGreaterThan(1);

    // Last waypoint should be at or near target
    const lastWaypoint = path.waypoints[path.waypoints.length - 1];
    expect(lastWaypoint.x).toBeCloseTo(mockPathComponent.requestedTarget!.x, 1);
    expect(lastWaypoint.z).toBeCloseTo(mockPathComponent.requestedTarget!.z, 1);

    // Waypoints should form a progressive path
    for (let i = 1; i < path.waypoints.length; i++) {
      const prev = path.waypoints[i - 1];
      const curr = path.waypoints[i];
      
      // Each waypoint should be different from previous (path makes progress)
      const dx = curr.x - prev.x;
      const dz = curr.z - prev.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      expect(distance).toBeGreaterThan(0); // Path progresses
    }
  });

  it('T072: movement desire should be extractable from current waypoint', () => {
    // Act
    system.calculatePath(mockRobotPosition, mockPathComponent);

    // Assert: Can derive movement desire from path
    const path = mockPathComponent.path!;
    expect(path.waypoints.length).toBeGreaterThan(1);
    
    // Use next waypoint (index 1) since index 0 is the start position
    const nextWaypointIndex = Math.min(1, path.waypoints.length - 1);
    const nextWaypoint = path.waypoints[nextWaypointIndex];
    
    // Compute desired movement vector from robot position to next waypoint
    const desireX = nextWaypoint.x - mockRobotPosition.x;
    const desireZ = nextWaypoint.z - mockRobotPosition.z;
    const desireMagnitude = Math.sqrt(desireX * desireX + desireZ * desireZ);

    // Desire should point toward waypoint (unless already at destination)
    expect(desireMagnitude).toBeGreaterThan(0);

    // Normalized desire represents direction
    const directionX = desireX / desireMagnitude;
    const directionZ = desireZ / desireMagnitude;

    // Direction components should be reasonable (-1 to 1)
    expect(Math.abs(directionX)).toBeLessThanOrEqual(1);
    expect(Math.abs(directionZ)).toBeLessThanOrEqual(1);
  });

  it('T072: pathfinding system provides waypoint-based desires for concurrent blending', () => {
    // Arrange: Multiple robots with different paths
    const robot1Pos = { x: 10, y: 0, z: 10 };
    const robot1Path: PathComponent = {
      path: null,
      status: 'pending',
      requestedTarget: { x: 90, y: 0, z: 50 },
      currentWaypointIndex: 0,
      lastCalculationTime: 0,
    };

    const robot2Pos = { x: 10, y: 0, z: 90 };
    const robot2Path: PathComponent = {
      path: null,
      status: 'pending',
      requestedTarget: { x: 90, y: 0, z: 10 },
      currentWaypointIndex: 0,
      lastCalculationTime: 0,
    };

    // Act: Calculate both paths
    system.calculatePath(robot1Pos, robot1Path, 'robot-1');
    system.calculatePath(robot2Pos, robot2Path, 'robot-2');

    // Assert: Both robots have independent movement desires
    expect(robot1Path.path).not.toBeNull();
    expect(robot2Path.path).not.toBeNull();

    // Desires should be different (different targets)
    const robot1Waypoint = robot1Path.path!.waypoints[0];
    const robot2Waypoint = robot2Path.path!.waypoints[0];

    // Starting waypoints match their respective start positions
    expect(robot1Waypoint.x).toBeCloseTo(robot1Pos.x, 1);
    expect(robot2Waypoint.x).toBeCloseTo(robot2Pos.x, 1);
    
    // Paths have independent waypoint sequences
    expect(robot1Path.path!.waypoints.length).toBeGreaterThan(0);
    expect(robot2Path.path!.waypoints.length).toBeGreaterThan(0);
  });
});
