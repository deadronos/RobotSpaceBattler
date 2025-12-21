# Implementation Plan: NavMesh Pathfinding System

**Branch**: `007-specify-scripts-bash` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-specify-scripts-bash/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See
`.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This repository already contains a NavMesh pathfinding *library* under
`src/simulation/ai/pathfinding/` (plus unit/integration tests under `tests/`). The
remaining work for this spec is primarily documentation alignment (this plan, data model,
quickstart) and optional gameplay integration (routing robot movement through the
pathfinding outputs).

The implemented library provides:

- NavMesh generation from arena geometry (grid rasterization + rectangle decomposition)
- Path search (A* wrapper around the `navmesh` npm package)
- Path smoothing (funnel-style waypoint reduction + optimizer)
- Integration helpers (`PathfindingSystem`, `PathComponent`, `NavMeshResource`)
- Performance controls (per-robot throttling and per-frame execution budget)
- Telemetry callbacks for path calculation events

## Technical Context

**Language/Version**: TypeScript 5.x (ES2022 target)  
**Primary Dependencies**: React 19, React Three Fiber (@react-three/fiber), Rapier3D
(@react-three/rapier), Miniplex ECS, `navmesh` npm package ^2.3.1  
**Storage**: N/A (in-memory navigation mesh, no persistence required)  
**Testing**: Vitest (unit tests), Playwright (E2E), Testing Library (component tests)  
**Target Platform**: Modern Chromium browsers (Chrome 120+, Edge 120+), WebGL 2.0  
**Project Type**: Web application (single-page 3D simulation)  
**Performance Goals**: 60 fps for 10v10 matches, budgeted work per tick via
`PathfindingSystem` (default `frameBudget` 2.4ms) and per-robot throttling (default
`throttleInterval` 333ms)  
**Constraints**: <5MB memory for pathfinding data, default 0.95m clearance radius for mesh
generation, browser JavaScript execution (no native/WASM initially). Dynamic obstacle updates
are not currently integrated; mesh updates require recreating the
`PathfindingSystem`/search state.  
**Scale/Scope**: 20 simultaneous robots, 100x100m arena, 10-15 major structural elements (walls, pillars, obstacles)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Component & Library-First

- ✅ **PASS**: Pathfinding will be organized as a library under `src/simulation/ai/pathfinding/` with clear API exports
- ✅ **PASS**: Navigation mesh generation, A* search, and path smoothing will be separate composable modules
- ✅ **PASS**: All modules will include unit tests and integration tests with ECS systems


### II. Test-First (TDD)

- ✅ **PASS**: TDD workflow required - tests will be written before implementation
- ✅ **PASS**: Unit tests for pure pathfinding algorithms (A*, string pulling, polygon decomposition)
- ✅ **PASS**: Integration tests for ECS system integration and robot navigation behavior
- ✅ **PASS**: Contract tests for API guarantees (path calculation time, memory usage)


### III. Size & Separation Limits

- ⚠️ **EXCEPTION (documented in code)**: `PathfindingSystem.ts` exceeds the 300 LOC guideline and
   includes a `CONSTITUTION-EXEMPT` header with justification.
- ✅ **PASS**: Related functionality is still separated into modules (navmesh generation,
   search, smoothing, integration).


### IV. React & r3f Best Practices

- ✅ **PASS**: Pathfinding is simulation logic - will be pure TypeScript with no React dependencies
- ✅ **PASS**: Visualization (if needed) will be separate r3f components consuming pathfinding state
- ✅ **PASS**: No heavy computations in useFrame - pathfinding runs in ECS systems outside render loop


### V. Observability, Performance & Target Platforms

- ✅ **PASS**: Performance targets defined: <5ms path calculation, <10% CPU overhead
- ✅ **PASS**: Will instrument with performance.now() timing and memory profiling
- ✅ **PASS**: Target platform: Chrome 120+/Edge 120+ with WebGL 2.0
- ⚠️ **MONITOR**: Need to add structured logging for pathfinding failures and recalculations


### VI. Deprecation & Dependency Hygiene

- ✅ **PASS**: NavMesh library choice is captured in research.md and implemented via the
   `navmesh` npm package.
- ✅ **PASS**: Will evaluate existing reactive steering system for deprecation after NavMesh is stable
- ⚠️ **MONITOR**: Dependency audit required if adding external NavMesh library


## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/simulation/ai/pathfinding/
├── index.ts
├── types.ts
├── navmesh/
│   ├── ArenaGeometryExtractor.ts
│   └── NavMeshGenerator.ts
├── search/
│   ├── AStarSearch.ts
│   ├── NearestAccessiblePoint.ts
│   └── PathCache.ts
├── smoothing/
│   ├── PathOptimizer.ts
│   └── StringPuller.ts
└── integration/
   ├── NavMeshResource.ts
   ├── PathComponent.ts
   └── PathfindingSystem.ts

src/visuals/debug/
├── NavMeshDebugger.tsx
└── PathDebugger.tsx

tests/simulation/ai/pathfinding/
├── edge-cases.test.ts
├── memory.test.ts
├── observability.test.ts
├── performance.test.ts
├── integration/
│   ├── movement-desire.test.ts
│   └── PathfindingSystem.test.ts
├── navmesh/
│   └── NavMeshGenerator.test.ts
├── search/
│   ├── AStarSearch.test.ts
│   └── PathCache.test.ts
└── smoothing/
   ├── PathOptimizer.test.ts
   └── StringPuller.test.ts

tests/integration/
├── pathfinding-navigation.test.ts
├── pathfinding-narrow-passage.test.ts
└── pathfinding-smoothing.test.ts
```

**Structure Decision**: Web application structure with single project layout. Pathfinding is
organized as a library under `src/simulation/ai/pathfinding/` with clear module separation for
mesh generation, search algorithms, path smoothing, and integration helpers. Tests mirror the
source structure under `tests/simulation/ai/pathfinding/`.

## Phase 0: Research (Completed)

**Status**: ✅ Complete  
**Duration**: N/A (subagent research)  
**Output**: [research.md](./research.md)

### Research Findings

**Decision**: Use the `navmesh` npm package (mikewesthad/navmesh) for path search and funnel
style smoothing primitives.

**Key Rationale**:

- Performance: 5-150x faster than grid-based A* (benchmarked)
- Size: ~200KB with zero dependencies (well under 5MB budget)
- Features: Complete A* search + funnel algorithm for path smoothing
- TypeScript-native with built-in type definitions
- Battle-tested: 4+ years production use, 370+ GitHub stars
- Memory efficient: Polygon representation vs grid (900 nodes → 27 nodes)

**Alternatives Evaluated**:

1. `@recast-navigation/core` - Industry standard but heavy (1.5MB WASM + 2-3MB runtime)
2. `three-pathfinding` - Good but requires pre-baked NavMeshes from Blender
3. `Yuka` - Full AI toolkit but feature overlap with existing systems
4. Custom implementation - Too risky and time-consuming

**Risk Mitigation**:

- Performance profiling with 20 robots required
- Memory monitoring to verify <5MB budget
- Fallback to reactive steering if navmesh fails
- Consider @recast-navigation upgrade path for future dynamic obstacles

---

## Phase 1: Design & Contracts (Completed)

**Status**: ✅ Complete  
**Duration**: N/A (generated during /speckit.plan)  
**Outputs**:

- [data-model.md](./data-model.md) - Canonical data structures
- [contracts/pathfinding-api.md](./contracts/pathfinding-api.md) - API contracts and behavioral guarantees
- [quickstart.md](./quickstart.md) - Development workflow and TDD guide

### Design Summary

**Core Modules (as implemented)**:

1. **NavMesh generation** (`src/simulation/ai/pathfinding/navmesh/`)
   - `ArenaGeometryExtractor`: pulls walkable bounds + obstacle footprints
   - `NavMeshGenerator`: grid rasterization + rectangle decomposition → convex polygons

2. **Search** (`src/simulation/ai/pathfinding/search/`)
   - `AStarSearch`: wrapper around `navmesh` for path search over polygons
   - `NearestAccessiblePoint`: fallback target selection when requested target is unreachable
   - `PathCache`: LRU/TTL cache for repeated queries

3. **Smoothing** (`src/simulation/ai/pathfinding/smoothing/`)
   - `StringPuller`: funnel-style waypoint reduction
   - `PathOptimizer`: post-processing and simplification

4. **Integration** (`src/simulation/ai/pathfinding/integration/`)
   - `PathComponent`: per-robot requested target + path status
   - `NavMeshResource`: shared mesh + metrics + cache
   - `PathfindingSystem`: budgeted, throttled calculation that mutates `PathComponent`

**Key Design Decisions (current behavior)**:

- `PathfindingSystem.calculatePath(start, pathComponent, robotId?)` reads
   `pathComponent.requestedTarget` and mutates the component (sets `path`, `status`,
   timestamps).
- `PathfindingSystem.execute(robotsWithPaths)` processes a list of robot snapshots, enforcing a
   per-call time budget.
- Recalculation is driven by the caller marking/setting `requestedTarget` (there is no
   integrated event bus or obstacle invalidation API).
- When a requested target is unreachable, the system can fall back to a nearest-accessible
   point (enabled by default).

**Memory Budget**:

- NavMesh: ~20KB (100 polygons × 160 bytes)
- Active paths: ~12.8KB (20 robots × 640 bytes)
- Path cache: ~640KB (1000 cached paths)
- Library runtime: ~500KB
- **Total: ~1.17MB** (well under 5MB budget)

**Constitution Re-Check**:

- ⚠️ `PathfindingSystem.ts` is a documented exception to the 300 LOC guideline.
- ✅ TDD workflow enforced in quickstart.md
- ✅ Component & Library-First architecture
- ✅ No r3f dependencies in simulation logic
- ⚠️ Observability/monitoring needs structured logging implementation

---

## Complexity Tracking

Only used when Constitution Check has violations requiring justification.

- `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` exceeds the 300 LOC guideline
   and is explicitly marked `CONSTITUTION-EXEMPT` in-code with justification.
