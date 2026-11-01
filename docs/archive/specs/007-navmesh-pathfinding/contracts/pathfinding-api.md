# Pathfinding API Contract

**Feature**: NavMesh Pathfinding (library)  
**Version**: 1.0.0 (as implemented)  
**Date**: 2025-12-18

## Overview

This contract documents the currently implemented public API for the NavMesh
pathfinding module under `src/simulation/ai/pathfinding/**`.

Important scope notes:

- This module provides NavMesh generation and path calculation utilities.
- It is not currently wired into the main robot movement loop; live robot
   navigation still uses reactive steering (`src/simulation/ai/pathing/**`).

## Core API

### NavMeshGenerator

Generates a `NavigationMesh` from a static `ArenaConfiguration`.

```ts
class NavMeshGenerator {
   generateFromArena(
      arenaConfig: ArenaConfiguration,
      clearanceRadius?: number,
   ): NavigationMesh;
}
```

Behavior:

- Uses a grid rasterization + greedy rectangular decomposition approach.
- Default `clearanceRadius` is `0.95` (meters).

### NavMeshResource

Wrapper resource used by the integration layer. It stores the mesh and rolling
performance metrics.

```ts
class NavMeshResource {
   constructor(mesh: NavigationMesh, meshInstance?: NavMesh);

   get mesh(): NavigationMesh;
   get metrics(): {
      totalCalculations: number;
      averageCalculationTimeMs: number;
      maxCalculationTimeMs: number;
      cacheHitRate: number;
      memoryUsageBytes: number;
   };

   recordCalculation(calculationTimeMs: number): void;
   updateCacheHitRate(hitRate: number): void;
}
```

### PathComponent

Component shape used by the integration layer.

```ts
type PathComponentStatus = "pending" | "valid" | "invalid" | "failed";

interface PathComponent {
   path: NavigationPath | null;
   status: PathComponentStatus;
   requestedTarget: Point3D | null;
   currentWaypointIndex: number;
   lastCalculationTime: number;

   // Legacy/back-compat fields
   needsRecalculation?: boolean;
   targetPosition?: Point3D | null;
   lastCalculatedAt?: number;
   recalculationCount?: number;
}
```

### PathfindingSystem

Integration helper that mutates a `PathComponent` in-place.

```ts
class PathfindingSystem {
   constructor(navMeshResource: NavMeshResource, options?: {
      enableSmoothing?: boolean;
      enableCaching?: boolean;
      maxCacheSize?: number;
      throttleInterval?: number; // ms between recalculations per robot
      frameBudget?: number; // ms budget per execute() call
      enableNearestFallback?: boolean;

      // Present in options, but not currently enforced by implementation
      enableTimeout?: boolean;
      timeoutMs?: number;
   });

   onTelemetry(callback: (event: PathfindingTelemetryEvent) => void): void;

   calculatePath(start: Point3D, pathComponent: PathComponent, robotId?: string): void;

   execute(
      robotsWithPaths: Array<{
         pathComponent: PathComponent;
         position: Point3D;
         id?: string;
      }>,
   ): void;
}
```

Contracted behavior:

- `calculatePath(...)` reads `pathComponent.requestedTarget` (if null, no-op).
- `calculatePath(...)` mutates `pathComponent`.
- On success: sets `pathComponent.path`, `status = "valid"`, and
   `lastCalculationTime = Date.now()`.
- On failure: sets `pathComponent.path = null`, `status = "failed"`.
- Optional nearest-accessible-point fallback is enabled by default
  (`enableNearestFallback = true`).
- Throttling is per `robotId` and based on wall-clock time (`Date.now()`).
  If throttled, the function returns early without changing component state.
- `execute(...)` processes robots whose `pathComponent.status === "pending"` and
  have a `requestedTarget`, stopping early if it exceeds `frameBudget`.

## Telemetry

Telemetry is callback-based (no direct dependency on the game telemetry port).

```ts
type PathfindingTelemetryEvent = {
   type:
      | "path-calculation-start"
      | "path-calculation-complete"
      | "path-calculation-failed";
   entityId?: string;
   timestamp: number;
   from?: Point3D;
   to?: Point3D;
   success?: boolean;
   durationMs?: number;
   pathLength?: number;
   waypointCount?: number;
   fromCache?: boolean;
   error?: string;
};
```

Notes:

- Timestamps use `Date.now()` and will differ run-to-run.

## Current limitations

- Dynamic obstacle invalidation is not implemented. There is no
   `invalidatePathsNearObstacle(...)` API.
- Although `NavMeshResource.updateMesh(...)` exists, `PathfindingSystem` does not
   rebuild its internal search state when the mesh changes. Treat the mesh as
   immutable for a `PathfindingSystem` instance.
- Timeout enforcement is not implemented. `enableTimeout`/`timeoutMs` options are
   present but do not currently abort computations.

## Version History

- **1.0.0** (2025-12-18): Documented as-implemented API
