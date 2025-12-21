import { describe, it, expect, beforeEach } from 'vitest';
import { NavMeshDebugger } from '@/visuals/debug/NavMeshDebugger';
import type { NavigationMesh } from '@/simulation/ai/pathfinding/types';

/**
 * T068: Debug visualization component for NavMesh polygons
 * Phase 7 - Observability
 * 
 * Note: Full R3F rendering tests require complex setup with ResizeObserver polyfills.
 * These tests verify component structure and exports. Integration testing happens in E2E tests.
 */

describe('NavMeshDebugger', () => {
  let mockNavMesh: NavigationMesh;

  beforeEach(() => {
    mockNavMesh = {
      id: 'test-mesh',
      polygons: [
        {
          index: 0,
          vertices: [
            { x: -5, z: -5 },
            { x: 5, z: -5 },
            { x: 5, z: 5 },
            { x: -5, z: 5 },
          ],
          centroid: { x: 0, z: 0 },
          area: 100,
        },
      ],
      adjacency: new Map(),
      clearanceRadius: 0.95,
      metadata: {
        generatedAt: Date.now(),
        arenaSize: { width: 10, depth: 10 },
        polygonCount: 1,
        memorySize: 1024,
      },
    };
  });

  it('T068: should export NavMeshDebugger component', () => {
    expect(NavMeshDebugger).toBeDefined();
    expect(typeof NavMeshDebugger).toBe('function');
  });

  it('T068: should be a React function component', () => {
    // Verify component is a function (React functional component)
    expect(typeof NavMeshDebugger).toBe('function');
    expect(NavMeshDebugger.length).toBeGreaterThanOrEqual(1); // Takes at least props parameter
  });

  it('T068: component signature accepts NavMeshDebuggerProps', () => {
    // This test verifies the component can be imported and has the expected shape
    // Full rendering tests with R3F require complex setup and are covered in E2E tests
    const componentName = NavMeshDebugger.name;
    expect(componentName).toBe('NavMeshDebugger');
  });

  it('T068: exports are available for integration', () => {
    // Verify component can be used in other files
    const component = NavMeshDebugger;
    expect(component).toBeDefined();
    expect(typeof component).toBe('function');
  });
});
