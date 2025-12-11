# NavMesh Pathfinding Quickstart

Quick guide to running and testing the NavMesh pathfinding system.

## Running Tests

### All Pathfinding Tests (55 tests)

```bash
npm run test -- tests/simulation/ai/pathfinding/
```

Expected: ✅ 55/55 tests passing

### Phase-Specific Tests

#### Phase 1-3: Foundation (12 tests)

```bash
npm run test -- tests/simulation/ai/pathfinding/navmesh/
npm run test -- tests/simulation/ai/pathfinding/search/
npm run test -- tests/simulation/ai/pathfinding/smoothing/
```

#### Phase 4-5: Integration & Observability (10 tests)

```bash
npm run test -- tests/simulation/ai/pathfinding/integration/PathfindingSystem.test.ts
npm run test -- tests/simulation/ai/pathfinding/observability.test.ts
```

#### Phase 6: Edge Cases & Performance (9 tests)

```bash
npm run test -- tests/simulation/ai/pathfinding/edge-cases.test.ts
npm run test -- tests/simulation/ai/pathfinding/performance.test.ts
npm run test -- tests/simulation/ai/pathfinding/memory.test.ts
```

#### Phase 7: Narrow Passages (6 tests)

```bash
npm run test -- tests/integration/pathfinding-narrow-passage.test.ts
npm run test -- tests/integration/pathfinding-smoothing.test.ts
```

#### Phase 8: Behavior Blending (18 tests)

```bash
npm run test -- tests/simulation/ai/pathfinding/integration/movement-desire.test.ts
npm run test -- tests/integration/ai-behavior-blending.test.ts
```

## Running Visual Debuggers

### NavMesh Debugger

Shows NavMesh polygon structure:

```tsx
import { NavMeshDebugger } from "@/visuals/debug/NavMeshDebugger";

<NavMeshDebugger visible={true} navMeshResource={navMeshResource} />;
```

### Path Debugger

Shows active robot paths:

```tsx
import { PathDebugger } from "@/visuals/debug/PathDebugger";

<PathDebugger
  visible={true}
  pathComponents={robotPaths}
  positions={robotPositions}
/>;
```

## Performance Benchmarks

### Memory Usage (T048)

```bash
npm run test -- tests/simulation/ai/pathfinding/memory.test.ts
```

**Target**: <5MB sustained for full arena NavMesh + cache

### Path Calculation (T047)

```bash
npm run test -- tests/simulation/ai/pathfinding/performance.test.ts
```

**Target**: <5ms P95 for individual robot path calculation

### System Execution (T021, T046)

```bash
npm run test -- tests/simulation/ai/pathfinding/integration/PathfindingSystem.test.ts
```

**Target**: <16ms for 20 robots simultaneously (60fps budget)

## Integration Examples

### Basic Usage

```typescript
import { PathfindingSystem } from "@/simulation/ai/pathfinding/integration/PathfindingSystem";
import { NavMeshResource } from "@/simulation/ai/pathfinding/integration/NavMeshResource";

// 1. Create NavMesh resource
const navMeshResource = new NavMeshResource({
  vertices: arenaVertices,
  walls: arenaWalls,
  pillars: arenaPillars,
  clearanceRadius: 1.0,
});

// 2. Create pathfinding system
const pathfindingSystem = new PathfindingSystem(navMeshResource, {
  enableSmoothing: true,
  enableCaching: true,
  maxCacheSize: 100,
  throttleInterval: 100, // ms
});

// 3. Calculate path for robot
const robot = { position: { x: 0, y: 0, z: 0 }, pathComponent: {} };
pathfindingSystem.calculatePath(robot.position, robot.pathComponent, robot.id);

// 4. Check result
if (robot.pathComponent.status === "success") {
  const waypoints = robot.pathComponent.path.waypoints;
  // Follow waypoints...
}
```

### Behavior Blending

```typescript
import { BehaviorBlender } from "@/simulation/ai/coordination/BehaviorBlender";

const blender = new BehaviorBlender();

// Pathfinding desire from waypoint
const pathfindingDesire = {
  velocity: computeDirectionToWaypoint(robot, waypoint),
  priority: "pathfinding" as const,
  weight: 0.6,
};

// Combat desire from targeting
const combatDesire = {
  velocity: computeStrafeDirection(robot, target),
  priority: "combat" as const,
  weight: 0.8,
};

// Blend behaviors
const finalVelocity = blender.blend([pathfindingDesire, combatDesire]);
robot.velocity = finalVelocity;
```

### Telemetry Monitoring

```typescript
pathfindingSystem.onTelemetry((event) => {
  if (event.type === "path-calculation-complete") {
    console.log(`Path calculated in ${event.durationMs}ms`);
    console.log(
      `Waypoints: ${event.waypointCount}, Cache hit: ${event.fromCache}`,
    );
  }
});
```

## Troubleshooting

### No path found

```typescript
if (pathComponent.status === "failed") {
  // Check if target is reachable
  // May need to use nearest accessible point fallback
}
```

### Performance issues

- Check cache hit rate in telemetry
- Verify throttling is enabled
- Profile with performance tests
- Reduce maxCacheSize if memory is constrained

### Path looks jagged

- Enable smoothing: `enableSmoothing: true`
- Check clearanceRadius (default: 1.0)
- Verify string-pulling optimization is active

## Architecture Reference

**Core Components**:

- `NavMeshGenerator` - Converts geometry to walkable polygons
- `AStarSearch` - Finds optimal paths through NavMesh
- `PathOptimizer` + `StringPuller` - Smooths and shortens paths
- `PathCache` - LRU cache with 60s TTL
- `PathfindingSystem` - Main ECS integration layer
- `BehaviorBlender` - Blends pathfinding with other AI behaviors

**Performance Characteristics**:

- Path calculation: <5ms P95
- System execution: <16ms for 20 robots (60fps)
- Memory: <5MB sustained
- Cache hit rate: >70% typical

See [AGENTS.md](../AGENTS.md) for detailed architecture documentation.
