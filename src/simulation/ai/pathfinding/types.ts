/**
 * Core type definitions for NavMesh pathfinding system
 * @module pathfinding/types
 */

/**
 * 2D point in arena space (x, z coordinates)
 */
export interface Point2D {
  readonly x: number;
  readonly z: number;
}

/**
 * 3D point in arena space
 */
export interface Point3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Convex polygon representing a walkable region
 */
export interface ConvexPolygon {
  readonly index: number;
  readonly vertices: ReadonlyArray<Point2D>;
  readonly centroid: Point2D;
  readonly area: number;
}

/**
 * Navigation mesh representing walkable space
 */
export interface NavigationMesh {
  readonly id: string;
  readonly polygons: ReadonlyArray<ConvexPolygon>;
  readonly adjacency: ReadonlyMap<number, number[]>;
  readonly clearanceRadius: number;
  readonly metadata: {
    readonly generatedAt: number;
    readonly arenaSize: { readonly width: number; readonly depth: number };
    readonly polygonCount: number;
    readonly memorySize: number;
  };
}

/**
 * Path status enumeration
 */
export enum PathStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  INVALIDATED = 'invalidated',
  NO_PATH = 'no_path',
  CALCULATING = 'calculating',
  FAILED = 'failed',
}

/**
 * Individual waypoint in a navigation path
 */
export interface PathNode {
  readonly position: Point3D;
  readonly polygonIndex: number;
  readonly distanceFromStart: number;
  readonly heading?: number;
}

/**
 * Navigation path for a single robot
 */
export interface NavigationPath {
  readonly id: string;
  readonly robotId: string;
  readonly waypoints: ReadonlyArray<Point3D>;
  currentIndex: number;
  status: PathStatus;
  readonly metadata: {
    readonly generatedAt: number;
    readonly calculationTime: number;
    readonly pathLength: number;
    readonly waypointCount: number;
  };
  readonly debug?: {
    readonly rawPath: ReadonlyArray<Point3D>;
    readonly polygonPath: readonly number[];
  };
}

/**
 * Obstacle type enumeration
 */
export enum ObstacleType {
  WALL = 'wall',
  PILLAR = 'pillar',
  CENTRAL_OBSTACLE = 'central_obstacle',
  ARENA_BOUNDARY = 'arena_boundary',
}

/**
 * Static obstacle geometry for NavMesh generation
 */
export interface ObstacleGeometry {
  readonly id: string;
  readonly type: ObstacleType;
  readonly footprint: ReadonlyArray<Point2D>;
  readonly height: number;
  readonly passable: boolean;
}

/**
 * Arena configuration for NavMesh generation
 */
export interface ArenaConfiguration {
  readonly size: { readonly width: number; readonly depth: number };
  readonly obstacles: ReadonlyArray<ObstacleGeometry>;
}

/**
 * Walkable region for semantic pathfinding
 */
export interface WalkableRegion {
  readonly name: string;
  readonly polygonIndices: readonly number[];
  readonly bounds: {
    readonly min: Point2D;
    readonly max: Point2D;
  };
  readonly area: number;
  readonly connections: readonly string[];
}
