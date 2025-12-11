/**
 * NavMesh generator for converting arena geometry to navigation polygons
 * @module pathfinding/navmesh
 */

import type {
  ArenaConfiguration,
  ConvexPolygon,
  NavigationMesh,
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
    // For now, create simplified mesh - full implementation in future tasks
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
   * Simplified implementation for MVP - creates coarse mesh
   * TODO: Implement proper obstacle avoidance and polygon decomposition
   */
  private generatePolygonsWithObstacles(
    size: { width: number; depth: number },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _obstacles: readonly { footprint: readonly Point2D[] }[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _clearanceRadius: number,
  ): ConvexPolygon[] {
    // Simplified: divide arena into quadrants and avoid obstacle areas
    const halfWidth = size.width / 2;
    const halfDepth = size.depth / 2;

    // Create 4 quadrant polygons (simplified mesh)
    const polygons: ConvexPolygon[] = [
      // Top-left quadrant
      {
        index: 0,
        vertices: [
          { x: 0, z: 0 },
          { x: halfWidth, z: 0 },
          { x: halfWidth, z: halfDepth },
          { x: 0, z: halfDepth },
        ],
        centroid: { x: halfWidth / 2, z: halfDepth / 2 },
        area: halfWidth * halfDepth,
      },
      // Top-right quadrant
      {
        index: 1,
        vertices: [
          { x: halfWidth, z: 0 },
          { x: size.width, z: 0 },
          { x: size.width, z: halfDepth },
          { x: halfWidth, z: halfDepth },
        ],
        centroid: { x: halfWidth + halfWidth / 2, z: halfDepth / 2 },
        area: halfWidth * halfDepth,
      },
      // Bottom-left quadrant
      {
        index: 2,
        vertices: [
          { x: 0, z: halfDepth },
          { x: halfWidth, z: halfDepth },
          { x: halfWidth, z: size.depth },
          { x: 0, z: size.depth },
        ],
        centroid: { x: halfWidth / 2, z: halfDepth + halfDepth / 2 },
        area: halfWidth * halfDepth,
      },
      // Bottom-right quadrant
      {
        index: 3,
        vertices: [
          { x: halfWidth, z: halfDepth },
          { x: size.width, z: halfDepth },
          { x: size.width, z: size.depth },
          { x: halfWidth, z: size.depth },
        ],
        centroid: {
          x: halfWidth + halfWidth / 2,
          z: halfDepth + halfDepth / 2,
        },
        area: halfWidth * halfDepth,
      },
    ];

    return polygons;
  }

  /**
   * Build adjacency graph connecting neighboring polygons
   */
  private buildAdjacencyGraph(
    polygons: ConvexPolygon[],
  ): Map<number, number[]> {
    const adjacency = new Map<number, number[]>();

    // Simplified: connect adjacent quadrants
    if (polygons.length === 4) {
      adjacency.set(0, [1, 2]); // Top-left connects to top-right and bottom-left
      adjacency.set(1, [0, 3]); // Top-right connects to top-left and bottom-right
      adjacency.set(2, [0, 3]); // Bottom-left connects to top-left and bottom-right
      adjacency.set(3, [1, 2]); // Bottom-right connects to top-right and bottom-left
    }

    return adjacency;
  }

  /**
   * Estimate memory usage for NavMesh data structure
   */
  private estimateMemorySize(polygonCount: number): number {
    // Rough estimate: ~200 bytes per polygon + overhead
    return polygonCount * 200 + 1024;
  }
}
