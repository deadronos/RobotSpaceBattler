# Implementation Plan: NavMesh Pathfinding System

**Branch**: `007-specify-scripts-bash` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-specify-scripts-bash/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement Navigation Mesh (NavMesh) pathfinding system that enables robots to navigate intelligently around arena obstacles using convex polygon decomposition of walkable space, A* search across navigation polygons, and string pulling for smooth paths. The system must support 20 simultaneous robots with <5ms path calculation time, <10% CPU overhead, and generate smooth curved paths rather than grid-based movements.

## Technical Context

**Language/Version**: TypeScript 5.x (ES2022 target)  
**Primary Dependencies**: React 18, React Three Fiber (@react-three/fiber), Rapier3D (@react-three/rapier), Miniplex ECS, `navmesh` library v2.3.1 (mikewesthad/navmesh)  
**Storage**: N/A (in-memory navigation mesh, no persistence required)  
**Testing**: Vitest (unit tests), Playwright (E2E), Testing Library (component tests)  
**Target Platform**: Modern Chromium browsers (Chrome 120+, Edge 120+), WebGL 2.0  
**Project Type**: Web application (single-page 3D simulation)  
**Performance Goals**: 60 fps for 10v10 matches, <5ms path calculation (individual), <2.4ms
PathfindingSystem.execute() per frame, <16ms total frame budget (all systems), <10% CPU overhead
for pathfinding, <15% frame budget for peak simultaneous calculations  
**Constraints**: <5MB memory for pathfinding data, <100ms path recalculation on dynamic obstacles, 0.95m clearance radius for robot navigation, browser JavaScript execution (no native/WASM initially), event-driven path recalculation (not continuous polling)  
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
- ✅ **PASS**: All source files will be kept under 300 LOC
- ✅ **PASS**: Separate modules for: mesh generation, A* search, path smoothing, ECS integration
- ⚠️ **MONITOR**: NavMesh generation complexity may require careful module splitting

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
- ✅ **PASS**: NEEDS CLARIFICATION on NavMesh library choice will be resolved in Phase 0 research
- ✅ **PASS**: Will evaluate existing reactive steering system for deprecation after NavMesh is stable
- ⚠️ **MONITOR**: Dependency audit required if adding external NavMesh library

## Project Structure

### Documentation (this feature)

```
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
src/simulation/
├── systems.ts                    # ECS system registration (existing file - add PathfindingSystem here)
└── ai/pathfinding/
├── navmesh/
│   ├── NavMeshGenerator.ts      # Convex polygon decomposition of walkable space
│   ├── NavMeshTypes.ts          # Type definitions for mesh data structures
│   └── PolygonDecomposer.ts     # Decompose obstacles into convex regions
├── search/
│   ├── AStarSearch.ts           # A* pathfinding across navigation polygons
│   ├── Heuristics.ts            # Distance heuristics for search
│   └── PathCache.ts             # Cache for frequently requested paths
├── smoothing/
│   ├── StringPuller.ts          # String pulling algorithm for path smoothing
│   └── PathOptimizer.ts         # Additional path optimization utilities
├── integration/
│   ├── PathfindingSystem.ts     # ECS system for path calculation and updates
│   ├── PathComponent.ts         # ECS component for storing robot paths
│   └── NavMeshResource.ts       # Shared NavMesh resource for all robots
└── index.ts                     # Public API exports

tests/simulation/ai/pathfinding/
├── navmesh/
│   ├── NavMeshGenerator.test.ts
│   └── PolygonDecomposer.test.ts
├── search/
│   ├── AStarSearch.test.ts
│   └── PathCache.test.ts
├── smoothing/
│   ├── StringPuller.test.ts
│   └── PathOptimizer.test.ts
└── integration/
    ├── PathfindingSystem.test.ts
    └── PathComponent.test.ts

playwright/tests/
└── pathfinding-e2e.spec.ts      # E2E tests for robot navigation behavior
```

**Structure Decision**: Web application structure with single project layout. Pathfinding is organized as a library under `src/simulation/ai/pathfinding/` with clear module separation for mesh generation, search algorithms, path smoothing, and ECS integration. Tests mirror the source structure under `tests/simulation/ai/pathfinding/`. This aligns with the existing project structure where AI systems live under `src/simulation/ai/`.

## Phase 0: Research (Completed)

**Status**: ✅ Complete  
**Duration**: N/A (subagent research)  
**Output**: [research.md](./research.md)

### Research Findings

**Decision**: Use `navmesh` library by mikewesthad (https://github.com/mikewesthad/navmesh)

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

**Core Modules**:
1. **NavMesh Generation** (`src/simulation/ai/pathfinding/navmesh/`)
   - NavMeshGenerator: Converts arena geometry to navigation polygons
   - PolygonDecomposer: Decomposes concave areas into convex polygons
   - NavMeshTypes: Type definitions

2. **Pathfinding Search** (`src/simulation/ai/pathfinding/search/`)
   - AStarSearch: A* algorithm across navigation polygons
   - Heuristics: Distance estimation functions
   - PathCache: LRU cache for frequently-requested paths

3. **Path Smoothing** (`src/simulation/ai/pathfinding/smoothing/`)
   - StringPuller: Funnel algorithm for waypoint reduction
   - PathOptimizer: Additional smoothing utilities

4. **ECS Integration** (`src/simulation/ai/pathfinding/integration/`)
   - PathfindingSystem: ECS system for path calculation
   - PathComponent: Stores robot navigation paths
   - NavMeshResource: Shared NavMesh instance

**Key Design Decisions**:
- Event-driven recalculation (not polling) for efficiency
- Dynamic memory allocation within 5MB budget
- Concurrent execution model (pathfinding blends with combat/targeting AI)
- Fallback to stale path on timeout (>100ms) with degraded behavior flag
- 0.95m clearance radius (vs 0.891m collision radius) for safety margin

**Memory Budget**:
- NavMesh: ~20KB (100 polygons × 160 bytes)
- Active paths: ~12.8KB (20 robots × 640 bytes)
- Path cache: ~640KB (1000 cached paths)
- Library runtime: ~500KB
- **Total: ~1.17MB** (well under 5MB budget)

**Constitution Re-Check**:
- ✅ All modules < 300 LOC (requires careful splitting)
- ✅ TDD workflow enforced in quickstart.md
- ✅ Component & Library-First architecture
- ✅ No r3f dependencies in simulation logic
- ⚠️ Observability/monitoring needs structured logging implementation

---

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations requiring justification**. All constitution principles have been satisfied or are monitored for compliance during implementation.
