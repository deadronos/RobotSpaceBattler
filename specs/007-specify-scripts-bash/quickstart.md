# Quickstart: NavMesh Pathfinding Development

**Feature**: NavMesh Pathfinding System  
**Date**: 2025-12-10  
**For**: Developers implementing or testing the pathfinding system

## Prerequisites

- Node.js 18+ installed
- Repository cloned and dependencies installed (`npm install`)
- Basic understanding of ECS architecture (Miniplex)
- Familiarity with TypeScript and Vitest

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
# Install navmesh library
npm install navmesh

# Verify installation
npm list navmesh
# Should show: navmesh@2.3.1 (or latest)
```

### 2. Verify Development Environment

```bash
# Run existing tests to ensure baseline works
npm run test

# Start dev server to see current arena
npm run dev
# Open http://localhost:5173
```

### 3. Create Feature Branch (if not already on 007-specify-scripts-bash)

```bash
git checkout -b 007-navmesh-pathfinding
```

---

## Development Workflow

### TDD Cycle (Red-Green-Refactor)

The implementation MUST follow Test-First development:

#### Step 1: Write Failing Test (RED)

```bash
# Create test file
touch tests/simulation/ai/pathfinding/NavMeshGenerator.test.ts

# Run tests (should fail - test exists but implementation doesn't)
npm run test:watch
```

Example first test:

```typescript
// tests/simulation/ai/pathfinding/NavMeshGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { NavMeshGenerator } from '@/simulation/ai/pathfinding/navmesh/NavMeshGenerator';

describe('NavMeshGenerator', () => {
  it('generates navigation mesh from simple arena', () => {
    const generator = new NavMeshGenerator();
    const arenaConfig = {
      size: { width: 100, depth: 100 },
      obstacles: [] // Empty arena for first test
    };
    
    const navMesh = generator.generateFromArena(arenaConfig);
    
    // Assertions
    expect(navMesh).toBeDefined();
    expect(navMesh.polygons.length).toBeGreaterThan(0);
    expect(navMesh.metadata.memorySize).toBeLessThan(5 * 1024 * 1024); // < 5MB
  });
});
```

#### Step 2: Implement Minimal Code (GREEN)

```bash
# Create implementation file
mkdir -p src/simulation/ai/pathfinding/navmesh
touch src/simulation/ai/pathfinding/navmesh/NavMeshGenerator.ts
```

Implement just enough to pass the test:

```typescript
// src/simulation/ai/pathfinding/navmesh/NavMeshGenerator.ts
import { NavMesh } from 'navmesh';
import type { NavigationMesh, ArenaConfiguration } from '../types';

export class NavMeshGenerator {
  generateFromArena(arenaConfig: ArenaConfiguration, clearanceRadius = 0.95): NavigationMesh {
    // Minimal implementation - single polygon for empty arena
    const polygon = [
      { x: 0, z: 0 },
      { x: arenaConfig.size.width, z: 0 },
      { x: arenaConfig.size.width, z: arenaConfig.size.depth },
      { x: 0, z: arenaConfig.size.depth }
    ];
    
    // TODO: Handle obstacles, decompose into convex polygons
    
    return {
      id: crypto.randomUUID(),
      polygons: [{
        index: 0,
        vertices: polygon,
        centroid: { x: arenaConfig.size.width / 2, z: arenaConfig.size.depth / 2 },
        area: arenaConfig.size.width * arenaConfig.size.depth
      }],
      adjacency: new Map(),
      clearanceRadius,
      metadata: {
        generatedAt: Date.now(),
        arenaSize: arenaConfig.size,
        polygonCount: 1,
        memorySize: 1024 // Rough estimate
      }
    };
  }
}
```

Run tests - should pass:

```bash
npm run test -- NavMeshGenerator
```

#### Step 3: Refactor (REFACTOR)

- Extract helper functions
- Improve type safety
- Add documentation
- Optimize performance

Run tests again - should still pass.

---

## Running Tests

### Unit Tests

```bash
# Run all pathfinding tests
npm run test -- pathfinding

# Run specific test file
npm run test -- NavMeshGenerator.test.ts

# Run in watch mode (recommended during development)
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Integration Tests

```bash
# Run ECS integration tests
npm run test -- integration/pathfinding

# Run with specific match scenario
npm run test -- PathfindingSystem.test.ts
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npm run playwright:install

# Run E2E pathfinding tests
npm run playwright:test -- pathfinding-e2e.spec.ts

# Run in headed mode (see browser)
npm run playwright:test -- --headed pathfinding-e2e.spec.ts
```

---

## Development Tasks (Ordered by TDD Workflow)

### Phase 1: NavMesh Generation (Week 1)

1. **Task 1.1**: NavMeshGenerator - Empty Arena
   - Test: Generate mesh for arena with no obstacles
   - Implementation: Single polygon covering arena bounds
   - Acceptance: Mesh has 1 polygon, memory < 1KB

2. **Task 1.2**: NavMeshGenerator - Single Wall Obstacle
   - Test: Generate mesh avoiding one wall
   - Implementation: Subtract wall footprint from arena polygon
   - Acceptance: Mesh has 2-4 polygons around wall

3. **Task 1.3**: NavMeshGenerator - Pillar Obstacles
   - Test: Generate mesh with cylindrical pillars
   - Implementation: Inflate pillar radius by clearanceRadius, subtract from walkable area
   - Acceptance: Polygons do not intersect pillar boundaries

4. **Task 1.4**: NavMeshGenerator - Convex Decomposition
   - Test: Complex concave arena → convex polygons
   - Implementation: Use polygon decomposition algorithm (or library)
   - Acceptance: All output polygons are convex (verified by test)

### Phase 2: Pathfinding (Week 2)

5. **Task 2.1**: A* Search - Straight Line Path
   - Test: Find path in empty arena from (0,0) to (100,100)
   - Implementation: Basic A* with navmesh library
   - Acceptance: Path found, length ≈ 141.4m (sqrt(100^2 + 100^2))

6. **Task 2.2**: A* Search - Path Around Single Obstacle
   - Test: Start and target separated by wall
   - Implementation: A* across navigation polygons
   - Acceptance: Path navigates around wall, no collision

7. **Task 2.3**: Path Smoothing - Funnel Algorithm
   - Test: Path through multiple polygons → smooth waypoints
   - Implementation: Integrate navmesh funnel algorithm
   - Acceptance: Waypoints reduced by >50%, path length < 110% optimal

8. **Task 2.4**: Path Caching
   - Test: Repeated identical queries → cache hit
   - Implementation: Add PathCache with LRU eviction
   - Acceptance: Cache hit rate > 80% for repeated queries

### Phase 3: ECS Integration (Week 3)

9. **Task 3.1**: PathComponent
   - Test: Attach PathComponent to robot entity
   - Implementation: Define component schema per data-model.md
   - Acceptance: Component stores path, target, recalculation flag

10. **Task 3.2**: PathfindingSystem - Basic Execution
    - Test: System calculates path for robots with needsRecalculation = true
    - Implementation: Query robots, call calculatePath, store result
    - Acceptance: Path stored in PathComponent after system runs

11. **Task 3.3**: Event-Driven Recalculation
    - Test: Obstacle spawn → invalidate affected paths
    - Implementation: Listen to obstacle events, set needsRecalculation
    - Acceptance: Only affected robots recalculate (not all robots)

12. **Task 3.4**: Recalculation Throttling
    - Test: Rapid recalculation requests → throttled to 3/sec
    - Implementation: Check lastCalculatedAt timestamp
    - Acceptance: Max 3 recalculations per robot per second

### Phase 4: Performance & Polish (Week 4)

13. **Task 4.1**: Performance Profiling
    - Test: 20 robots all request paths → complete in <16ms
    - Implementation: Add performance instrumentation
    - Acceptance: 95% of paths calculated in <5ms, system.execute() <2.4ms

14. **Task 4.2**: Memory Profiling
    - Test: Measure memory usage over 10-minute match
    - Implementation: Add memory tracking in NavMeshResource.metrics
    - Acceptance: Memory usage < 5MB sustained

15. **Task 4.3**: Debug Visualization
    - Test: Enable DEBUG=true → see NavMesh and paths in 3D view
    - Implementation: Add r3f components for mesh/path rendering
    - Acceptance: Polygons and paths visible, toggle-able

16. **Task 4.4**: Error Handling
    - Test: Invalid start/target → graceful fallback
    - Implementation: Try-catch with PathfindingError, log warnings
    - Acceptance: No crashes, errors logged with context

---

## Debugging Tools

### Enable Debug Logging

```bash
# Set DEBUG environment variable
DEBUG=pathfinding npm run dev
```

In code:

```typescript
import debug from 'debug';
const log = debug('pathfinding:generator');

log('Generating NavMesh for arena', arenaConfig);
```

### Visualize NavMesh in Browser

Add to `App.tsx` (temporary dev feature):

```typescript
import { NavMeshDebugger } from '@/visuals/NavMeshDebugger';

function App() {
  return (
    <Canvas>
      {/* ...existing code... */}
      {import.meta.env.DEV && <NavMeshDebugger />}
    </Canvas>
  );
}
```

### Performance Profiling

```typescript
// In PathfindingSystem.ts
const startTime = performance.now();
const path = this.calculatePath(start, target);
const endTime = performance.now();

console.log(`Path calculation took ${endTime - startTime}ms`);
```

Or use Chrome DevTools:
1. Open browser DevTools (F12)
2. Go to Performance tab
3. Record while robots are navigating
4. Look for "PathfindingSystem.execute" in flame graph

### Memory Profiling

Chrome DevTools:
1. Performance Monitor (Cmd+Shift+P → "Show Performance Monitor")
2. Watch "JS Heap Size" during match
3. Take heap snapshot before/after pathfinding initialization
4. Look for retained NavMesh objects

---

## Common Issues & Solutions

### Issue 1: "Cannot find module 'navmesh'"

**Solution**:
```bash
npm install navmesh
# Or if using pnpm:
pnpm install navmesh
```

### Issue 2: Tests fail with "ReferenceError: crypto is not defined"

**Solution**: Add polyfill to test setup:

```typescript
// tests/setup.ts
import { webcrypto } from 'crypto';
global.crypto = webcrypto as unknown as Crypto;
```

### Issue 3: NavMesh generation takes >100ms

**Possible causes**:
- Too many obstacle polygons (simplify geometry)
- Excessive polygon decomposition (increase tolerance)
- Non-optimized algorithm (profile and optimize)

**Solution**: Add caching:
```typescript
// Cache NavMesh per arena configuration
const meshCache = new Map<string, NavigationMesh>();
const cacheKey = JSON.stringify(arenaConfig);
if (meshCache.has(cacheKey)) {
  return meshCache.get(cacheKey)!;
}
```

### Issue 4: Robots get stuck at polygon boundaries

**Possible causes**:
- Clearance radius too large (robots can't fit through passages)
- Polygon edges not properly connected in adjacency graph
- Path waypoints too close to boundaries

**Solution**: Increase polygon edge tolerance or reduce clearanceRadius

### Issue 5: Path calculation exceeds 5ms for some queries

**Possible causes**:
- Very long paths across many polygons
- Complex NavMesh with hundreds of polygons
- Inefficient heuristic function

**Solutions**:
1. Limit path search depth (fail early for very long paths)
2. Simplify NavMesh (fewer, larger polygons)
3. Cache frequent start/target pairs

---

## Code Review Checklist

Before submitting PR:

- [ ] All new code has tests (unit + integration)
- [ ] Tests follow TDD workflow (test written first)
- [ ] All tests pass: `npm run test`
- [ ] E2E tests pass: `npm run playwright:test`
- [ ] Code coverage > 80% for new code
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] ESLint passes: `npm run lint`
- [ ] No console.log (use debug logger instead)
- [ ] Performance contracts met (<5ms P95 path calculation)
- [ ] Memory usage < 5MB (verified with profiling)
- [ ] Source files < 300 LOC (constitution requirement)
- [ ] Documentation updated (inline comments + data-model.md if needed)
- [ ] CONSTITUTION-CHECK section in PR description

---

## Useful Commands Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Testing
npm run test                   # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run playwright:test        # E2E tests
npm run playwright:test -- --headed  # E2E with browser

# Code Quality
npm run lint                   # Run ESLint
npm run lint:fix               # Auto-fix ESLint issues
npm run typecheck              # TypeScript type checking
npm run format                 # Format code with Prettier

# Profiling (custom scripts - add to package.json if needed)
npm run profile:memory         # Memory profiling
npm run profile:performance    # Performance profiling
```

---

## Next Steps After Implementation

1. **Integration Testing**: Test with real match scenarios (10v10)
2. **Performance Tuning**: Optimize hot paths identified by profiling
3. **User Acceptance**: Observe robot navigation behavior in matches
4. **Documentation**: Update AGENTS.md and README.md with pathfinding info
5. **Deprecation**: Plan migration from reactive steering to NavMesh

---

## Additional Resources

- [navmesh library documentation](https://github.com/mikewesthad/navmesh)
- [A* algorithm explanation](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Funnel algorithm visualization](http://digestingduck.blogspot.com/2010/03/simple-stupid-funnel-algorithm.html)
- [Miniplex ECS documentation](https://github.com/hmans/miniplex)
- [Project constitution](.specify/memory/constitution.md)

---

## Getting Help

- Check `specs/007-specify-scripts-bash/spec.md` for requirements
- Review `specs/007-specify-scripts-bash/contracts/pathfinding-api.md` for API contracts
- Ask in project Discord/Slack (if applicable)
- Open discussion issue on GitHub
