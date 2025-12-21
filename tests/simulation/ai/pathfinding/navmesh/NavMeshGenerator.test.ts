/**
 * Unit tests for NavMeshGenerator
 * @module pathfinding/navmesh
 */

import { describe, expect, it } from 'vitest';

import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';
import type { ArenaConfiguration } from '@/simulation/ai/pathfinding/types';
import { ObstacleType } from '@/simulation/ai/pathfinding/types';

describe('NavMeshGenerator', () => {
  it('[T013] creates valid mesh from empty arena', () => {
    const generator = new NavMeshGenerator();
    const arenaConfig: ArenaConfiguration = {
      size: { width: 100, depth: 100 },
      obstacles: [],
    };

    const navMesh = generator.generateFromArena(arenaConfig);

    // Verify mesh is defined and has expected structure
    expect(navMesh).toBeDefined();
    expect(navMesh.id).toBeDefined();
    expect(navMesh.polygons.length).toBeGreaterThan(0);
    expect(navMesh.metadata.arenaSize.width).toBe(100);
    expect(navMesh.metadata.arenaSize.depth).toBe(100);
    expect(navMesh.metadata.memorySize).toBeLessThan(5 * 1024 * 1024); // < 5MB
  });

  it('[T014] handles single wall obstacle correctly', () => {
    const generator = new NavMeshGenerator();
    const arenaConfig: ArenaConfiguration = {
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: 'test-wall',
          type: 0 as any, // ObstacleType.WALL
          footprint: [
            { x: 40, z: 40 },
            { x: 60, z: 40 },
            { x: 60, z: 60 },
            { x: 40, z: 60 },
          ],
          height: 2.5,
          passable: false,
        },
      ],
    };

    const navMesh = generator.generateFromArena(arenaConfig);

    // Should have multiple polygons around the wall
    expect(navMesh.polygons.length).toBeGreaterThan(1);
    // Verify clearance is respected (obstacle should be inflated)
    expect(navMesh.clearanceRadius).toBe(0.95);
  });

  it('[T015] handles multiple pillar obstacles', () => {
    const generator = new NavMeshGenerator();

    function createOctagon(cx: number, cz: number, r: number) {
      const sides = 8;
      const footprint = [] as { x: number; z: number }[];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        footprint.push({ x: cx + r * Math.cos(angle), z: cz + r * Math.sin(angle) });
      }
      return footprint;
    }

    const arenaConfig: ArenaConfiguration = {
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: 'pillar-1',
          type: 1 as any, // ObstacleType.PILLAR
          // Place pillars at different positions
          footprint: createOctagon(30, 30, 2),
          height: 2.5,
          passable: false,
        },
        {
          id: 'pillar-2',
          type: 1 as any, // ObstacleType.PILLAR
          footprint: createOctagon(70, 70, 2),
          height: 2.5,
          passable: false,
        },
      ],
    };

    const navMesh = generator.generateFromArena(arenaConfig);

    // Should have polygons navigating around pillars
    expect(navMesh.polygons.length).toBeGreaterThan(1);
    expect(navMesh.metadata.polygonCount).toBe(navMesh.polygons.length);
  });
});
