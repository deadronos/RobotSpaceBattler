/**
 * The navmesh must be generated in arena (world) coordinates.
 *
 * Regression test for #217: the extractor used to pass only a size, so the
 * generated polygons covered [0, 96] while the arena, its walls and the robots
 * live in [-48, 48]. Every live path request therefore returned `no_path`.
 */

import { describe, expect, it } from "vitest";

import { isPointInPolygon } from "@/lib/math/geometry";
import { AStarSearch } from "@/simulation/ai/pathfinding/search/AStarSearch";
import { extractArenaConfiguration } from "@/simulation/ai/pathfinding/navmesh/ArenaGeometryExtractor";
import { NavMeshGenerator } from "@/simulation/ai/pathfinding/navmesh/NavMeshGenerator";
import type {
  NavigationMesh,
  Point2D,
} from "@/simulation/ai/pathfinding/types";
import { ARENA_BOUNDS } from "@/simulation/environment/arenaGeometry";

function isWalkable(mesh: NavigationMesh, point: Point2D): boolean {
  return mesh.polygons.some((polygon) =>
    isPointInPolygon(point, polygon.vertices),
  );
}

describe("arena geometry extraction", () => {
  it("carries the arena origin into the configuration", () => {
    const config = extractArenaConfiguration();

    expect(config.origin).toEqual({
      x: ARENA_BOUNDS.min.x,
      z: ARENA_BOUNDS.min.z,
    });
    expect(config.size).toEqual({
      width: ARENA_BOUNDS.max.x - ARENA_BOUNDS.min.x,
      depth: ARENA_BOUNDS.max.z - ARENA_BOUNDS.min.z,
    });
  });

  it("generates polygons that cover the arena's real coordinates", () => {
    const mesh = new NavMeshGenerator().generateFromArena(
      extractArenaConfiguration(),
    );

    const xs = mesh.polygons.flatMap((polygon) =>
      polygon.vertices.map((vertex) => vertex.x),
    );
    const zs = mesh.polygons.flatMap((polygon) =>
      polygon.vertices.map((vertex) => vertex.z),
    );

    // The mesh spans the arena instead of starting at (0, 0).
    expect(Math.min(...xs)).toBeCloseTo(ARENA_BOUNDS.min.x, 5);
    expect(Math.max(...xs)).toBeCloseTo(ARENA_BOUNDS.max.x, 5);
    expect(Math.min(...zs)).toBeCloseTo(ARENA_BOUNDS.min.z, 5);
    expect(Math.max(...zs)).toBeCloseTo(ARENA_BOUNDS.max.z, 5);
    expect(Math.min(...xs)).toBeLessThan(0);
    expect(Math.min(...zs)).toBeLessThan(0);
  });

  it("treats open floor as walkable and obstacles as blocked", () => {
    const mesh = new NavMeshGenerator().generateFromArena(
      extractArenaConfiguration(),
    );

    // Open floor away from every wall and pillar.
    expect(isWalkable(mesh, { x: 10, z: 10 })).toBe(true);
    expect(isWalkable(mesh, { x: -40, z: 0 })).toBe(true);

    // Inside the central obstacle, an internal wall and a corner pillar.
    expect(isWalkable(mesh, { x: 0, z: 0 })).toBe(false);
    expect(isWalkable(mesh, { x: 0, z: 20 })).toBe(false);
    expect(isWalkable(mesh, { x: -30, z: -30 })).toBe(false);
  });

  it("finds a path across the arena between open-floor points", () => {
    const mesh = new NavMeshGenerator().generateFromArena(
      extractArenaConfiguration(),
    );
    const start = { x: -40, z: 0 };
    const target = { x: 40, z: 0 };

    expect(isWalkable(mesh, start)).toBe(true);
    expect(isWalkable(mesh, target)).toBe(true);

    const path = new AStarSearch(mesh).findPath(start, target);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThanOrEqual(2);
    expect(path![0].x).toBeCloseTo(start.x, 5);
    expect(path![path!.length - 1].x).toBeCloseTo(target.x, 5);
  });
});
