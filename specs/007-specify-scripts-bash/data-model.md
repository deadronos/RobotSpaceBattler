# Data Model: NavMesh Pathfinding (Library)

**Feature**: NavMesh Pathfinding (library + integration helpers)  
**Date**: 2025-12-10  
**Derived From**: [spec.md](./spec.md), [contracts/pathfinding-api.md](./contracts/pathfinding-api.md)

## Overview

The canonical types for this feature are the exported TypeScript interfaces in the
repository. This document summarizes those shapes and calls out the integration-specific
structures that the library mutates.

## Core Library Types

Defined in `src/simulation/ai/pathfinding/types.ts`:

- `Point2D` and `Point3D`
- `ConvexPolygon` and `NavigationMesh`
- `NavigationPath`, `PathStatus`, and `PathNode`
- `ObstacleGeometry`, `ObstacleType`, and `ArenaConfiguration`

### NavigationMesh

`NavigationMesh` represents walkable space as convex polygons plus adjacency:

- `polygons: ReadonlyArray<ConvexPolygon>`
- `adjacency: ReadonlyMap<number, number[]>`
- `clearanceRadius: number`
- `metadata: { generatedAt, arenaSize, polygonCount, memorySize }`

### NavigationPath

`NavigationPath` is intentionally flexible because it is used in both the cache and the ECS
integration. The library always requires `waypoints`, and the remaining fields are optional.

- Required:
  - `waypoints: ReadonlyArray<Point3D>`
- Optional (commonly set by caching/search):
  - `totalDistance?: number`
  - `smoothed?: boolean`
- Optional (legacy/full-format fields supported by the type):
  - `id?: string`, `robotId?: string`
  - `currentIndex?: number`, `status?: PathStatus`
  - `metadata?: { generatedAt, calculationTime, pathLength, waypointCount }`
  - `debug?: { rawPath, polygonPath }`

## Integration Types

### PathComponent

Defined in `src/simulation/ai/pathfinding/integration/PathComponent.ts`.

`PathComponent` is the per-robot mutable state that `PathfindingSystem` reads/writes:

- `path: NavigationPath | null`
- `status: "pending" | "valid" | "invalid" | "failed"`
- `requestedTarget: Point3D | null`
- `currentWaypointIndex: number`
- `lastCalculationTime: number` (from `Date.now()`)

The component also includes legacy compatibility fields (`needsRecalculation`,
`targetPosition`, etc.) which may be present for older callers.

### NavMeshResource

Defined in `src/simulation/ai/pathfinding/integration/NavMeshResource.ts`.

`NavMeshResource` holds:

- The generated mesh (`mesh: NavigationMesh`)
- A `navmesh` package instance (`meshInstance`)
- Metrics (`totalCalculations`, `averageCalculationTimeMs`, `maxCalculationTimeMs`,
  `cacheHitRate`, `memoryUsageBytes`)
- A cache map (`pathCache`) used by integration code

## Data Flow (Current)

1. Generate `NavigationMesh` from arena geometry and create a `NavMeshResource`.
2. Create a `PathfindingSystem` with that resource.
3. When a robot needs a path, set `PathComponent.requestedTarget` and mark its
   `status` as `"pending"`.
4. Call `PathfindingSystem.execute(robotsWithPaths)` from your simulation tick.
5. Read `PathComponent.path.waypoints` and `currentWaypointIndex` to drive movement.

## Limitations

- Dynamic obstacle invalidation is not wired up end-to-end.
- Updating the NavMesh requires recreating the search/system state; updating
  `NavMeshResource` alone does not rebuild internal search structures.
