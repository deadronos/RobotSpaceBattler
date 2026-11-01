/**
 * Unit tests for NavMeshGenerator
 * @module pathfinding/navmesh
 */

import { describe, expect, it } from "vitest";

import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import type { ArenaConfiguration } from "@/simulation/ai/pathfinding/types";

describe("NavMeshGenerator", () => {
  it("[T013] creates valid mesh from empty arena", () => {
    const generator = new NavMeshGenerator();
    const arenaConfig: ArenaConfiguration = {
      origin: { x: 0, z: 0 },
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

  it("[T014] handles single wall obstacle correctly", () => {
    const generator = new NavMeshGenerator();
    const arenaConfig: ArenaConfiguration = {
      origin: { x: 0, z: 0 },
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: "test-wall",
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

  it("[T015] handles multiple pillar obstacles", () => {
    const generator = new NavMeshGenerator();

    function createOctagon(cx: number, cz: number, r: number) {
      const sides = 8;
      const footprint = [] as { x: number; z: number }[];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides;
        footprint.push({
          x: cx + r * Math.cos(angle),
          z: cz + r * Math.sin(angle),
        });
      }
      return footprint;
    }

    const arenaConfig: ArenaConfiguration = {
      origin: { x: 0, z: 0 },
      size: { width: 100, depth: 100 },
      obstacles: [
        {
          id: "pillar-1",
          type: 1 as any, // ObstacleType.PILLAR
          // Place pillars at different positions
          footprint: createOctagon(30, 30, 2),
          height: 2.5,
          passable: false,
        },
        {
          id: "pillar-2",
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

  it("[#217] anchors the grid at the configured origin", () => {
    const generator = new NavMeshGenerator();
    const origin = { x: -48, z: -48 };
    const arenaConfig: ArenaConfiguration = {
      origin,
      size: { width: 96, depth: 96 },
      obstacles: [],
    };

    const navMesh = generator.generateFromArena(arenaConfig);
    const vertices = navMesh.polygons.flatMap((polygon) => polygon.vertices);

    expect(vertices).toEqual([
      { x: origin.x, z: origin.z },
      { x: origin.x + 96, z: origin.z },
      { x: origin.x + 96, z: origin.z + 96 },
      { x: origin.x, z: origin.z + 96 },
    ]);
    expect(navMesh.polygons[0].centroid).toEqual({ x: 0, z: 0 });
  });

  it("[#217] keeps an offset origin when obstacles are subtracted", () => {
    const generator = new NavMeshGenerator();
    const arenaConfig: ArenaConfiguration = {
      origin: { x: -25, z: -25 },
      size: { width: 50, depth: 50 },
      obstacles: [
        {
          id: "centre-block",
          type: 0 as any, // ObstacleType.WALL
          footprint: [
            { x: -3, z: -3 },
            { x: 3, z: -3 },
            { x: 3, z: 3 },
            { x: -3, z: 3 },
          ],
          height: 2.5,
          passable: false,
        },
      ],
    };

    const navMesh = generator.generateFromArena(arenaConfig);
    const xs = navMesh.polygons.flatMap((polygon) =>
      polygon.vertices.map((vertex) => vertex.x),
    );
    const zs = navMesh.polygons.flatMap((polygon) =>
      polygon.vertices.map((vertex) => vertex.z),
    );

    expect(Math.min(...xs)).toBeCloseTo(-25, 5);
    expect(Math.max(...xs)).toBeCloseTo(25, 5);
    expect(Math.min(...zs)).toBeCloseTo(-25, 5);
    expect(Math.max(...zs)).toBeCloseTo(25, 5);

    // Obstacle cells are still carved out around the origin, not around (0, 0).
    const coversCentre = navMesh.polygons.some((polygon) => {
      const minX = polygon.vertices[0].x;
      const maxX = polygon.vertices[1].x;
      const minZ = polygon.vertices[0].z;
      const maxZ = polygon.vertices[3].z;
      return minX < 0 && maxX > 0 && minZ < 0 && maxZ > 0;
    });
    expect(coversCentre).toBe(false);
  });
});
