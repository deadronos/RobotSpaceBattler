# Pathfinding API Contract

**Feature**: NavMesh Pathfinding  
**Version**: 1.0.0  
**Date**: 2025-12-10

## Overview

This contract defines the public API for the pathfinding system, including function signatures, behavior guarantees, and performance requirements.

## Core API

### PathfindingSystem

ECS system responsible for path calculation and recalculation.

```typescript
/**
 * PathfindingSystem calculates navigation paths for robots with PathComponent.
 * Runs once per frame, processing robots that need path recalculation.
 */
class PathfindingSystem {
  /**
   * Execute pathfinding queries for all robots needing paths.
   * 
   * @param world - Miniplex ECS world instance
   * @param deltaTime - Time since last frame (seconds)
   * 
   * Performance guarantee: Total execution time ≤ 15% of 16ms frame budget (~2.4ms)
   * for up to 20 simultaneous robots.
   */
  execute(world: World, deltaTime: number): void;
  
  /**
   * Calculate path from start to target position.
   * 
   * @param start - Starting 3D position (robot's current location)
   * @param target - Target 3D position (destination)
   * @returns Navigation path or null if no path exists
   * 
   * Performance guarantee: 95% of calls complete within 5ms
   * 
   * @throws {PathfindingError} if NavMesh resource not initialized
   */
  calculatePath(start: Point3D, target: Point3D): NavigationPath | null;
  
  /**
   * Invalidate paths affected by dynamic obstacle changes.
   * 
   * @param obstaclePosition - 3D position of spawned/moved obstacle
   * @param obstacleRadius - Collision radius of obstacle
   * 
   * Behavior: Sets needsRecalculation = true for robots whose paths
   * intersect with obstacle bounding sphere.
   * 
   * Performance guarantee: Completes within 1ms for 20 robots
   */
  invalidatePathsNearObstacle(obstaclePosition: Point3D, obstacleRadius: number): void;
}
```

### NavMeshGenerator

Generates navigation mesh from arena geometry.

```typescript
/**
 * NavMeshGenerator creates navigation mesh from arena obstacles.
 * Called once at match start.
 */
class NavMeshGenerator {
  /**
   * Generate navigation mesh from arena configuration.
   * 
   * @param arenaConfig - Arena geometry configuration
   * @param clearanceRadius - Robot clearance radius (default: 0.95m)
   * @returns Navigation mesh instance
   * 
   * Performance guarantee: Completes within 100ms for standard arena
   * 
   * Memory guarantee: Result consumes < 500KB
   * 
   * @throws {MeshGenerationError} if polygon decomposition fails
   */
  generateFromArena(
    arenaConfig: ArenaConfiguration,
    clearanceRadius?: number
  ): NavigationMesh;
  
  /**
   * Validate navigation mesh integrity.
   * 
   * @param mesh - Navigation mesh to validate
   * @returns Validation result with errors/warnings
   * 
   * Checks:
   * - All polygons are convex
   * - Adjacent polygons share edges
   * - No isolated regions (unless intentional)
   * - Memory usage < 5MB
   */
  validate(mesh: NavigationMesh): ValidationResult;
}
```

### PathComponent API

ECS component interface for robot pathfinding.

```typescript
/**
 * PathComponent attaches to robot entities to enable pathfinding.
 */
interface PathComponent {
  /**
   * Current navigation path.
   * Null if no path exists or path calculation failed.
   */
  path: NavigationPath | null;
  
  /**
   * Flag indicating path recalculation needed.
   * Set by:
   * - Obstacle spawn/move events
   * - Target position change
   * - Path completion
   * - Path invalidation
   */
  needsRecalculation: boolean;
  
  /**
   * Target destination for pathfinding.
   * Null if robot has no movement target.
   */
  targetPosition: Point3D | null;
  
  /**
   * Timestamp of last successful path calculation (milliseconds).
   * Used to prevent excessive recalculation.
   */
  lastCalculatedAt: number;
  
  /**
   * Number of recalculations in current frame.
   * Prevents infinite recalculation loops.
   * Reset to 0 at frame start.
   */
  recalculationCount: number;
}
```

---

## Behavioral Contracts

### Path Calculation Guarantees

1. **Determinism**: Given identical start/target positions and NavMesh, `calculatePath()` MUST return identical paths.

2. **Optimality**: Paths MUST be within 10% of theoretical shortest path length.

3. **Smoothness**: Paths MUST use funnel algorithm to eliminate unnecessary waypoints. Maximum 5° heading change between consecutive segments (except forced turns at corners).

4. **Collision-Free**: All waypoints MUST be at least `clearanceRadius` away from obstacle boundaries.

5. **Completeness**: If any path exists, `calculatePath()` MUST find a path. Returns `null` only when:
   - Start position outside NavMesh
   - Target position outside NavMesh
   - No connected polygons from start to target

### Performance Contracts

1. **Path Calculation Time**:
   - **P95**: ≤ 5ms per path
   - **P99**: ≤ 10ms per path
   - **Max**: ≤ 50ms (timeout, returns cached/fallback path)

2. **Frame Budget**:
   - PathfindingSystem.execute() MUST complete within 2.4ms (15% of 16ms frame)
   - If exceeded, defer remaining calculations to next frame

3. **Memory Usage**:
   - Total pathfinding memory ≤ 5MB
   - NavMesh static memory ≤ 500KB
   - Per-robot path memory ≤ 1KB
   - Path cache ≤ 1MB

4. **Recalculation Throttling**:
   - Maximum 3 recalculations per robot per second
   - If exceeded, use stale path with `PathStatus.INVALIDATED`

### Event-Driven Recalculation

**Trigger Events** (from clarifications):
- Obstacle spawn event → invalidate affected paths
- Obstacle move event → invalidate affected paths
- Target position change → set needsRecalculation = true
- Path completion → set needsRecalculation = false

**Non-Triggers** (explicitly excluded):
- ❌ Every frame polling
- ❌ Distance-based checks
- ❌ Periodic timers

### Fallback Behavior

When path calculation exceeds 100ms threshold (from clarifications):
1. Continue using current path with `PathStatus.INVALIDATED`
2. Mark behavior as degraded (log warning)
3. Retry recalculation on next event
4. After 3 failed attempts, fall back to reactive steering

### Concurrent Execution with AI Behaviors

From clarifications: Pathfinding output is blended with other AI behaviors (targeting, combat, retreat).

**Contract**: PathfindingSystem MUST:
- Emit movement desire vector (direction + magnitude)
- NOT directly modify robot position
- Allow higher-level systems to blend with combat/targeting desires
- Respect weighted blend priorities (defined in parent AI system)

---

## Error Handling

### PathfindingError

```typescript
class PathfindingError extends Error {
  readonly code: PathfindingErrorCode;
  readonly details?: Record<string, unknown>;
}

enum PathfindingErrorCode {
  NAVMESH_NOT_INITIALIZED = 'navmesh_not_initialized',
  INVALID_START_POSITION = 'invalid_start_position',
  INVALID_TARGET_POSITION = 'invalid_target_position',
  PATH_CALCULATION_TIMEOUT = 'path_calculation_timeout',
  MESH_GENERATION_FAILED = 'mesh_generation_failed',
  POLYGON_NOT_CONVEX = 'polygon_not_convex',
  MEMORY_BUDGET_EXCEEDED = 'memory_budget_exceeded'
}
```

**Error Recovery**:
- NAVMESH_NOT_INITIALIZED → Retry after initialization
- INVALID_START_POSITION → Use nearest valid position on NavMesh
- INVALID_TARGET_POSITION → Move to nearest accessible point with LOS
- PATH_CALCULATION_TIMEOUT → Use fallback behavior (see above)
- MESH_GENERATION_FAILED → Use fallback navigation (direct steering)
- MEMORY_BUDGET_EXCEEDED → Reduce path cache size, simplify mesh

---

## Testing Contracts

### Unit Test Requirements

1. **NavMeshGenerator**:
   - ✅ Generates valid mesh from simple arena (4 walls)
   - ✅ Handles pillar obstacles correctly
   - ✅ Respects clearanceRadius inflation
   - ✅ Produces convex polygons only
   - ✅ Memory usage < 500KB for standard arena

2. **PathfindingSystem**:
   - ✅ Finds shortest path in simple corridor
   - ✅ Navigates around corner obstacles
   - ✅ Returns null for unreachable targets
   - ✅ Completes within 5ms for 95% of queries
   - ✅ Handles start/target on polygon edges
   - ✅ Smooths paths using funnel algorithm

3. **Path Invalidation**:
   - ✅ Detects obstacle blocking current path
   - ✅ Triggers recalculation event
   - ✅ Handles simultaneous invalidations efficiently

### Integration Test Requirements

1. **ECS Integration**:
   - ✅ PathfindingSystem queries robots with needsRecalculation = true
   - ✅ Updates PathComponent.path with result
   - ✅ Resets needsRecalculation flag after calculation
   - ✅ Respects recalculation throttling (3/sec max)

2. **Multi-Robot Scenarios**:
   - ✅ 20 robots all request paths simultaneously → completes within 16ms
   - ✅ No path conflicts or race conditions
   - ✅ Memory usage remains < 5MB with 20 active paths

3. **Dynamic Obstacles**:
   - ✅ Obstacle spawn triggers path invalidation
   - ✅ Affected robots recalculate within 100ms
   - ✅ Unaffected robots keep existing paths

### Contract Test Requirements

1. **Performance Contracts**:
   - ✅ 1000 path queries, 95% complete < 5ms
   - ✅ PathfindingSystem.execute() < 2.4ms with 20 robots
   - ✅ Memory usage < 5MB sustained over 10-minute match

2. **Behavioral Contracts**:
   - ✅ Deterministic: Same inputs → same paths (10 trials)
   - ✅ Optimality: Path length ≤ 110% of theoretical shortest
   - ✅ Smoothness: Max 5° heading change between segments
   - ✅ Collision-free: All waypoints ≥ 0.95m from obstacles

---

## Observability

### Logging Requirements

```typescript
// INFO level (production)
logger.info('Path calculated', {
  robotId: string,
  pathLength: number,
  waypointCount: number,
  calculationTime: number,
  cacheHit: boolean
});

// WARN level (degraded behavior)
logger.warn('Path recalculation timeout', {
  robotId: string,
  attemptNumber: number,
  fallbackBehavior: string
});

// ERROR level (failures)
logger.error('Pathfinding error', {
  code: PathfindingErrorCode,
  robotId: string,
  details: Record<string, unknown>
});
```

### Metrics Requirements

```typescript
interface PathfindingMetrics {
  // Performance metrics
  averagePathCalculationTime: number; // milliseconds
  p95PathCalculationTime: number;
  p99PathCalculationTime: number;
  
  // Throughput metrics
  pathsCalculatedPerSecond: number;
  recalculationsPerSecond: number;
  
  // Cache metrics
  cacheHitRate: number; // 0-1
  cacheSize: number; // number of entries
  
  // Quality metrics
  averagePathLength: number; // meters
  averageWaypointCount: number;
  pathOptimalityRatio: number; // actual / theoretical shortest
  
  // Error metrics
  pathFailureRate: number; // 0-1
  timeoutCount: number;
  invalidationCount: number;
}
```

### Debug Visualization

When `DEBUG=true`:
- Render NavMesh polygons (green wireframe)
- Render active paths (blue lines)
- Render waypoints (yellow spheres)
- Render invalidated paths (red lines)
- Display per-robot path status text

---

## Deprecation Notice

After stable NavMesh implementation, the following systems MAY be deprecated:

1. **Reactive Steering** (`src/simulation/ai/pathing/avoidance.ts`)
   - Will be replaced by NavMesh-guided movement
   - Keep as fallback for path calculation failures
   - Deprecation timeline: After 2 stable releases with NavMesh

2. **AVOIDANCE_RADIUS** constant
   - Will be replaced by clearanceRadius in NavMesh
   - Deprecation timeline: Immediate after NavMesh integration

---

## Version History

- **1.0.0** (2025-12-10): Initial contract definition
  - Core API: PathfindingSystem, NavMeshGenerator, PathComponent
  - Performance guarantees: <5ms P95, <15% frame budget
  - Behavioral guarantees: Determinism, optimality, smoothness
  - Error handling: PathfindingError with recovery strategies
  - Observability: Logging, metrics, debug visualization
