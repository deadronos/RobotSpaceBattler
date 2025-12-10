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

// NavMesh generation (to be implemented)
// export { NavMeshGenerator } from './navmesh/NavMeshGenerator';
// export { PolygonDecomposer } from './navmesh/PolygonDecomposer';

// Pathfinding search (to be implemented)
// export { AStarSearch } from './search/AStarSearch';
// export { Heuristics } from './search/Heuristics';
// export { PathCache } from './search/PathCache';

// Path smoothing (to be implemented)
// export { StringPuller } from './smoothing/StringPuller';
// export { PathOptimizer } from './smoothing/PathOptimizer';

// ECS integration (to be implemented)
// export { PathfindingSystem } from './integration/PathfindingSystem';
// export { PathComponent } from './integration/PathComponent';
// export { NavMeshResource } from './integration/NavMeshResource';
