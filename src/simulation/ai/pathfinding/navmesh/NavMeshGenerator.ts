/**
 * NavMesh generator for converting arena geometry to navigation polygons
 * @module pathfinding/navmesh
 */

import {
  distanceSquaredPointToSegment,
  isPointInPolygon,
} from "../../../../lib/math/geometry";
import type {
  ArenaConfiguration,
  ConvexPolygon,
  NavigationMesh,
  ObstacleGeometry,
  Point2D,
} from "../types";

/**
 * Generates navigation meshes from arena configuration
 */
export class NavMeshGenerator {
  /**
   * Generate NavMesh from arena configuration
   * @param arenaConfig - Arena size and obstacles
   * @param clearanceRadius - Safety margin around obstacles (default: 0.95m)
   * @returns Generated navigation mesh
   */
  generateFromArena(
    arenaConfig: ArenaConfiguration,
    clearanceRadius = 0.95,
  ): NavigationMesh {
    const { size, obstacles } = arenaConfig;

    // For empty arena, create single polygon covering entire walkable area
    if (obstacles.length === 0) {
      const polygon: ConvexPolygon = {
        index: 0,
        vertices: [
          { x: 0, z: 0 },
          { x: size.width, z: 0 },
          { x: size.width, z: size.depth },
          { x: 0, z: size.depth },
        ],
        centroid: { x: size.width / 2, z: size.depth / 2 },
        area: size.width * size.depth,
      };

      return {
        id: crypto.randomUUID(),
        polygons: [polygon],
        adjacency: new Map(),
        clearanceRadius,
        metadata: {
          generatedAt: Date.now(),
          arenaSize: { width: size.width, depth: size.depth },
          polygonCount: 1,
          memorySize: this.estimateMemorySize(1),
        },
      };
    }

    // With obstacles, we need to subtract them from walkable area
    const polygons = this.generatePolygonsWithObstacles(
      size,
      obstacles,
      clearanceRadius,
    );

    return {
      id: crypto.randomUUID(),
      polygons,
      adjacency: this.buildAdjacencyGraph(polygons),
      clearanceRadius,
      metadata: {
        generatedAt: Date.now(),
        arenaSize: { width: size.width, depth: size.depth },
        polygonCount: polygons.length,
        memorySize: this.estimateMemorySize(polygons.length),
      },
    };
  }

  /**
   * Generate polygons with obstacles subtracted
   * Uses a grid-based approach to identify walkable areas and merges them into convex polygons (rectangles).
   */
  private generatePolygonsWithObstacles(
    size: { width: number; depth: number },
    obstacles: readonly (ObstacleGeometry | ({ footprint?: readonly Point2D[]; polygon?: readonly Point2D[] } & Record<string, unknown>))[],
    clearanceRadius: number,
  ): ConvexPolygon[] {
    const GRID_RESOLUTION = 0.5; // Grid cell size in meters
    const gridWidth = Math.ceil(size.width / GRID_RESOLUTION);
    const gridDepth = Math.ceil(size.depth / GRID_RESOLUTION);

    // Initialize grid (true = walkable, false = blocked)
    const grid: boolean[][] = Array.from({ length: gridWidth }, () =>
      Array(gridDepth).fill(true),
    );

    // Rasterize obstacles into the grid
    for (let x = 0; x < gridWidth; x++) {
      for (let z = 0; z < gridDepth; z++) {
        const cellCenter: Point2D = {
          x: x * GRID_RESOLUTION + GRID_RESOLUTION / 2,
          z: z * GRID_RESOLUTION + GRID_RESOLUTION / 2,
        };

        // Check against all obstacles
        for (const obstacle of obstacles) {
          type ObstacleLike = { footprint?: readonly Point2D[]; polygon?: readonly Point2D[] };
          const o = obstacle as ObstacleLike;
          const vertices = o.footprint ?? o.polygon;
          if (!vertices || vertices.length === 0) continue;
          const distance = this.getSquaredDistanceToPolygon(
            cellCenter,
            vertices,
          );
          // Block if distance is less than clearance radius squared
          // Note: getSquaredDistanceToPolygon returns 0 if inside
          if (distance < clearanceRadius * clearanceRadius) {
            grid[x][z] = false;
            break;
          }
        }
      }
    }

    const polygons: ConvexPolygon[] = [];
    let polygonIndex = 0;
    const visited: boolean[][] = Array.from({ length: gridWidth }, () =>
      Array(gridDepth).fill(false),
    );

    // Rectangular decomposition (Greedy merging)
    for (let z = 0; z < gridDepth; z++) {
      for (let x = 0; x < gridWidth; x++) {
        if (!grid[x][z] || visited[x][z]) continue;

        // Found a start of a new rectangle
        // Expand width
        let width = 1;
        while (
          x + width < gridWidth &&
          grid[x + width][z] &&
          !visited[x + width][z]
        ) {
          width++;
        }

        // Expand height
        let height = 1;
        let canExpandHeight = true;
        while (z + height < gridDepth && canExpandHeight) {
          // Check if the entire row of width 'width' is available
          for (let k = 0; k < width; k++) {
            if (
              !grid[x + k][z + height] ||
              visited[x + k][z + height]
            ) {
              canExpandHeight = false;
              break;
            }
          }
          if (canExpandHeight) {
            height++;
          }
        }

        // Mark cells as visited
        for (let dz = 0; dz < height; dz++) {
          for (let dx = 0; dx < width; dx++) {
            visited[x + dx][z + dz] = true;
          }
        }

        // Create polygon
        const minX = x * GRID_RESOLUTION;
        const minZ = z * GRID_RESOLUTION;
        // Clamp to arena size to ensure we don't exceed bounds
        const maxX = Math.min((x + width) * GRID_RESOLUTION, size.width);
        const maxZ = Math.min((z + height) * GRID_RESOLUTION, size.depth);

        const vertices: Point2D[] = [
          { x: minX, z: minZ },
          { x: maxX, z: minZ },
          { x: maxX, z: maxZ },
          { x: minX, z: maxZ },
        ];

        polygons.push({
          index: polygonIndex++,
          vertices,
          centroid: {
            x: minX + (maxX - minX) / 2,
            z: minZ + (maxZ - minZ) / 2,
          },
          area: (maxX - minX) * (maxZ - minZ),
        });
      }
    }

    return polygons;
  }

  /**
   * Build adjacency graph connecting neighboring polygons
   */
  private buildAdjacencyGraph(
    polygons: ConvexPolygon[],
  ): Map<number, number[]> {
    const adjacency = new Map<number, number[]>();

    for (let i = 0; i < polygons.length; i++) {
      adjacency.set(i, []);
    }

    for (let i = 0; i < polygons.length; i++) {
      for (let j = i + 1; j < polygons.length; j++) {
        if (this.arePolygonsAdjacent(polygons[i], polygons[j])) {
          adjacency.get(i)?.push(j);
          adjacency.get(j)?.push(i);
        }
      }
    }

    return adjacency;
  }

  /**
   * Check if two polygons are adjacent (share a boundary)
   * Assumes axis-aligned rectangles from grid decomposition
   */
  private arePolygonsAdjacent(
    polyA: ConvexPolygon,
    polyB: ConvexPolygon,
  ): boolean {
    const tolerance = 0.001; // Small epsilon for float comparison

    // Get bounds (assuming rectangle vertices order: TL, TR, BR, BL or similar)
    // Actually, we constructed them as: (minX, minZ), (maxX, minZ), (maxX, maxZ), (minX, maxZ)
    // Vertices: 0: minX,minZ; 1: maxX,minZ; 2: maxX,maxZ; 3: minX,maxZ

    const aMinX = polyA.vertices[0].x;
    const aMaxX = polyA.vertices[1].x;
    const aMinZ = polyA.vertices[0].z;
    const aMaxZ = polyA.vertices[3].z;

    const bMinX = polyB.vertices[0].x;
    const bMaxX = polyB.vertices[1].x;
    const bMinZ = polyB.vertices[0].z;
    const bMaxZ = polyB.vertices[3].z;

    // Check for overlap in X and touching in Z
    const xOverlap = Math.max(0, Math.min(aMaxX, bMaxX) - Math.max(aMinX, bMinX));
    const zTouching = Math.abs(aMaxZ - bMinZ) < tolerance || Math.abs(aMinZ - bMaxZ) < tolerance;

    if (xOverlap > tolerance && zTouching) return true;

    // Check for overlap in Z and touching in X
    const zOverlap = Math.max(0, Math.min(aMaxZ, bMaxZ) - Math.max(aMinZ, bMinZ));
    const xTouching = Math.abs(aMaxX - bMinX) < tolerance || Math.abs(aMinX - bMaxX) < tolerance;

    if (zOverlap > tolerance && xTouching) return true;

    return false;
  }

  /**
   * Calculate squared distance from point to polygon
   * Returns 0 if point is inside polygon
   */
  private getSquaredDistanceToPolygon(
    point: Point2D,
    vertices?: readonly Point2D[],
  ): number {
    if (!vertices || vertices.length === 0) return Infinity;

    // Check if inside first
    if (isPointInPolygon(point, vertices)) {
      return 0;
    }

    let minDistSq = Infinity;

    // Check distance to edges
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const distSq = distanceSquaredPointToSegment(
        point,
        vertices[i],
        vertices[j],
      );
      if (distSq < minDistSq) minDistSq = distSq;
    }

    return minDistSq;
  }

  /**
   * Estimate memory usage for NavMesh data structure
   */
  private estimateMemorySize(polygonCount: number): number {
    // Rough estimate: ~200 bytes per polygon + overhead
    return polygonCount * 200 + 1024;
  }
}
