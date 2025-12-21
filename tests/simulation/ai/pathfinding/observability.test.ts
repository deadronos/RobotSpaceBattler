import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PathfindingSystem } from '@/simulation/ai/pathfinding/integration/PathfindingSystem';
import { NavMeshResource } from '@/simulation/ai/pathfinding/integration/NavMeshResource';
import type { NavigationMesh, Point3D } from '@/simulation/ai/pathfinding/types';
import type { PathComponent } from '@/simulation/ai/pathfinding/integration/PathComponent';

/**
 * T067: Structured telemetry logging for path calculation events
 * T070: Metrics export from NavMeshResource
 *
 * Phase 7 TDD RED - Observability & Debug Tooling
 */

describe('PathfindingSystem Observability', () => {
  let navMeshResource: NavMeshResource;
  let system: PathfindingSystem;
  let mockPathComponent: PathComponent;

  beforeEach(() => {
    // Setup mock NavigationMesh
    const mockMesh: NavigationMesh = {
      id: 'test-mesh',
      polygons: [
        {
          index: 0,
          vertices: [
            { x: -10, z: -10 },
            { x: 10, z: -10 },
            { x: 10, z: 10 },
            { x: -10, z: 10 },
          ],
          centroid: { x: 0, z: 0 },
          area: 400,
        },
      ],
      adjacency: new Map(),
      clearanceRadius: 0.95,
      metadata: {
        generatedAt: Date.now(),
        arenaSize: { width: 20, depth: 20 },
        polygonCount: 1,
        memorySize: 1024,
      },
    };

    navMeshResource = new NavMeshResource(mockMesh);
    mockPathComponent = {
      path: null,
      status: 'pending',
      requestedTarget: { x: 5, y: 0, z: 5 },
      currentWaypointIndex: 0,
      lastCalculationTime: 0,
    };

    system = new PathfindingSystem(navMeshResource, { enableCaching: true });
  });

  it('T067: should emit telemetry events for path calculation start', () => {
    const telemetrySpy = vi.fn();
    system.onTelemetry(telemetrySpy);

    const robotPosition: Point3D = { x: 0, y: 0, z: 0 };
    const targetPosition: Point3D = { x: 5, y: 0, z: 5 };

    system.calculatePath(robotPosition, mockPathComponent, 'robot-1');

    expect(telemetrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'path-calculation-start',
        entityId: 'robot-1',
        from: robotPosition,
        to: targetPosition,
        timestamp: expect.any(Number),
      }),
    );
  });

  it('T067: should emit telemetry events for path calculation complete', () => {
    const telemetrySpy = vi.fn();
    system.onTelemetry(telemetrySpy);

    const robotPosition: Point3D = { x: 0, y: 0, z: 0 };
    mockPathComponent.requestedTarget = { x: 5, y: 0, z: 5 };

    system.calculatePath(robotPosition, mockPathComponent, 'robot-1');

    expect(telemetrySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'path-calculation-complete',
        entityId: 'robot-1',
        success: true,
        durationMs: expect.any(Number),
        pathLength: expect.any(Number),
        waypointCount: expect.any(Number),
        fromCache: expect.any(Boolean),
        timestamp: expect.any(Number),
      }),
    );
  });

  it('T067: should emit telemetry for cache hits', () => {
    // Create system with zero throttle interval to allow immediate recalculation
    const systemNoThrottle = new PathfindingSystem(navMeshResource, {
      enableCaching: true,
      throttleInterval: 0,
    });

    const telemetrySpy = vi.fn();
    systemNoThrottle.onTelemetry(telemetrySpy);

    const robotPosition: Point3D = { x: 0, y: 0, z: 0 };
    mockPathComponent.requestedTarget = { x: 5, y: 0, z: 5 };

    // First calculation - cache miss
    systemNoThrottle.calculatePath(robotPosition, mockPathComponent, 'robot-1');
    telemetrySpy.mockClear();

    // Second calculation - cache hit (same position)
    systemNoThrottle.calculatePath(robotPosition, mockPathComponent, 'robot-1');

    const cacheHitEvent = telemetrySpy.mock.calls.find(
      (call) => call[0].type === 'path-calculation-complete' && call[0].fromCache === true,
    );

    expect(cacheHitEvent).toBeDefined();
  });

  it('T070: should export performance metrics from NavMeshResource', () => {
    const robotPosition: Point3D = { x: 0, y: 0, z: 0 };
    mockPathComponent.requestedTarget = { x: 5, y: 0, z: 5 };

    system.calculatePath(robotPosition, mockPathComponent, 'robot-1');

    const metrics = navMeshResource.getMetrics();

    expect(metrics).toMatchObject({
      totalCalculations: expect.any(Number),
      averageCalculationTimeMs: expect.any(Number),
      maxCalculationTimeMs: expect.any(Number),
      cacheHitRate: expect.any(Number),
      memoryUsageBytes: expect.any(Number),
    });

    expect(metrics.totalCalculations).toBeGreaterThan(0);
    expect(metrics.averageCalculationTimeMs).toBeGreaterThanOrEqual(0);
    expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
    expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
  });

  it('T070: should track cache hit rate accurately over multiple calculations', () => {
    const positions: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: 0, z: 0 }, // Repeat - should hit cache
      { x: 2, y: 0, z: 2 },
      { x: 1, y: 0, z: 1 }, // Repeat - should hit cache
    ];

    const targetPosition: Point3D = { x: 5, y: 0, z: 5 };
    mockPathComponent.requestedTarget = targetPosition;

    positions.forEach((pos, i) => {
      system.calculatePath(pos, mockPathComponent, `robot-${i}`);
    });

    const metrics = navMeshResource.getMetrics();

    // 5 total calculations, 2 cache hits = 40% hit rate
    expect(metrics.totalCalculations).toBe(5);
    expect(metrics.cacheHitRate).toBeCloseTo(0.4, 1);
  });
});
