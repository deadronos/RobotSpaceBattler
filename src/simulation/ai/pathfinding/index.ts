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
} from "./types";
export { ObstacleType, PathStatus } from "./types";

// NavMesh generation
export { extractArenaConfiguration } from "./navmesh/ArenaGeometryExtractor";
export { NavMeshGenerator } from "./navmesh/NavMeshGenerator";

// Pathfinding search
export { AStarSearch } from "./search/AStarSearch";
export { NearestAccessiblePoint } from "./search/NearestAccessiblePoint";
export { PathCache } from "./search/PathCache";

// Path smoothing
export { PathOptimizer } from "./smoothing/PathOptimizer";
export { StringPuller } from "./smoothing/StringPuller";

// ECS integration
export { NavMeshResource } from "./integration/NavMeshResource";
export { createNavMeshResource } from "./integration/NavMeshResource";
export type { PathComponent } from "./integration/PathComponent";
export type { PathComponentStatus } from "./integration/PathComponent";
export { createPathComponent } from "./integration/PathComponent";
export type {
  PathfindingTelemetryCallback,
  PathfindingTelemetryEvent,
} from "./integration/PathfindingSystem";
export { PathfindingSystem } from "./integration/PathfindingSystem";
