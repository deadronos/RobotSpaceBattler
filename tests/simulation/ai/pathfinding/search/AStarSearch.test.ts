/**
 * Unit tests for A* Search algorithm
 * @module pathfinding/search
 */

import { describe, expect, it } from 'vitest';

import type { NavigationMesh, Point2D } from '@/simulation/ai/pathfinding/types';
import { AStarSearch } from '@/simulation/ai/pathfinding/search/AStarSearch';

describe('AStarSearch', () => {
  // Helper to create a simple empty arena mesh
  function createEmptyArenaMesh(): NavigationMesh {
    return {
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
  }

  it('[T016] finds straight-line path in empty arena', () => {
    const mesh = createEmptyArenaMesh();
    const search = new AStarSearch(mesh);
    
    const start: Point2D = { x: 0, z: 0 };
    const target: Point2D = { x: 100, z: 100 };
    
    const path = search.findPath(start, target);
    
    expect(path).not.toBeNull();
    if (path) {
      expect(path.length).toBeGreaterThanOrEqual(2); // At least start and end
      // Path length should be approximately sqrt(100^2 + 100^2) = 141.4
      const pathLength = calculatePathLength(path);
      expect(pathLength).toBeCloseTo(141.4, 1);
    }
  });

  it('[T017] finds path around single wall obstacle', () => {
    // This test will need a mesh with multiple polygons around a wall
    // Simplified for now - will be expanded when implementation exists
    const mesh = createEmptyArenaMesh();
    const search = new AStarSearch(mesh);
    
    const start: Point2D = { x: 10, z: 10 };
    const target: Point2D = { x: 90, z: 90 };
    
    const path = search.findPath(start, target);
    
    expect(path).not.toBeNull();
    if (path) {
      expect(path.length).toBeGreaterThan(0);
    }
  });
});

function calculatePathLength(path: Point2D[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dz = path[i].z - path[i - 1].z;
    length += Math.sqrt(dx * dx + dz * dz);
  }
  return length;
}
