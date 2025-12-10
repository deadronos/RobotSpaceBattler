/**
 * Public API exports for NavMesh pathfinding system
 * @module pathfinding
 */

// Core types
export type {
  ArenaConfiguration,
  ConvexPolygon,
  NavigationMesh,
  NavigationPath,
  ObstacleGeometry,
  PathNode,
  Point2D,
  Point3D,
  WalkableRegion,
} from './types';
export { ObstacleType,PathStatus } from './types';

// NavMesh generation
export { extractArenaConfiguration } from './navmesh/ArenaGeometryExtractor';
export { NavMeshGenerator } from './navmesh/NavMeshGenerator';

// Pathfinding search
export { AStarSearch } from './search/AStarSearch';

// Path smoothing
export { PathOptimizer } from './smoothing/PathOptimizer';
export { StringPuller } from './smoothing/StringPuller';

// ECS integration
export type { NavMeshResource } from './integration/NavMeshResource';
export { createNavMeshResource } from './integration/NavMeshResource';
export type { PathComponent } from './integration/PathComponent';
export { createPathComponent } from './integration/PathComponent';
export { PathfindingSystem } from './integration/PathfindingSystem';
