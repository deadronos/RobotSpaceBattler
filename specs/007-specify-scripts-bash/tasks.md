# Tasks: NavMesh Pathfinding System

**Input**: Design documents from `/specs/007-specify-scripts-bash/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pathfinding-api.md

**Tests**: Test tasks are included per constitution requirement (TDD mandatory)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- Single project structure: `src/` and `tests/` at repository root
- Pathfinding library under `src/simulation/ai/pathfinding/`
- Tests mirror source structure under `tests/simulation/ai/pathfinding/`

---

## Phase 1: Setup (Shared Infrastructure) ✅ COMPLETE

**Purpose**: Project initialization and dependency installation

- [X] T001 Install navmesh library: `npm install navmesh`
- [X] T002 [P] Create directory structure for pathfinding module in src/simulation/ai/pathfinding/
- [X] T003 [P] Create directory structure for pathfinding tests in tests/simulation/ai/pathfinding/
- [X] T004 [P] Create type definitions file at src/simulation/ai/pathfinding/types.ts
- [X] T005 [P] Create public API exports file at src/simulation/ai/pathfinding/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites) ✅ COMPLETE

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Define NavigationMesh interface in src/simulation/ai/pathfinding/types.ts
- [X] T007 Define NavigationPath interface in src/simulation/ai/pathfinding/types.ts
- [X] T008 Define PathNode interface in src/simulation/ai/pathfinding/types.ts
- [X] T009 Define ObstacleGeometry interface in src/simulation/ai/pathfinding/types.ts
- [X] T010 Define PathComponent ECS component in src/simulation/ai/pathfinding/integration/PathComponent.ts
- [X] T011 Define NavMeshResource ECS resource in src/simulation/ai/pathfinding/integration/NavMeshResource.ts
- [X] T012 Create arena geometry extraction utility to read walls/pillars/obstacles from existing arena data

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Intelligent Robot Navigation Around Complex Obstacles (Priority: P1) 🎯 MVP

**Goal**: Robots navigate smoothly around walls, pillars, and obstacles to reach targets without getting stuck

**Independent Test**: Place robot and target on opposite sides of wall cluster. Robot finds path around obstacles along natural route.

### Tests for User Story 1 (TDD Required)

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Unit test: NavMeshGenerator creates valid mesh from empty arena in tests/simulation/ai/pathfinding/navmesh/NavMeshGenerator.test.ts
- [ ] T014 [P] [US1] Unit test: NavMeshGenerator handles single wall obstacle correctly in tests/simulation/ai/pathfinding/navmesh/NavMeshGenerator.test.ts
- [ ] T015 [P] [US1] Unit test: NavMeshGenerator handles multiple pillar obstacles in tests/simulation/ai/pathfinding/navmesh/NavMeshGenerator.test.ts
- [ ] T016 [P] [US1] Unit test: AStarSearch finds straight-line path in empty arena in tests/simulation/ai/pathfinding/search/AStarSearch.test.ts
- [ ] T017 [P] [US1] Unit test: AStarSearch finds path around single wall obstacle in tests/simulation/ai/pathfinding/search/AStarSearch.test.ts
- [ ] T018 [P] [US1] Integration test: PathfindingSystem calculates path for robot with target in tests/simulation/ai/pathfinding/integration/PathfindingSystem.test.ts
- [ ] T019 [P] [US1] Integration test: Robot navigates around wall cluster in tests/integration/pathfinding-navigation.test.ts
- [ ] T020 [US1] Contract test: Path calculation completes within 5ms in 95% of cases in tests/simulation/ai/pathfinding/integration/PathfindingSystem.test.ts
- [ ] T021 [US1] Contract test: PathfindingSystem.execute() completes within 2.4ms with 20 robots in tests/simulation/ai/pathfinding/integration/PathfindingSystem.test.ts

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement NavMeshGenerator.generateFromArena() for empty arena (single polygon) in src/simulation/ai/pathfinding/navmesh/NavMeshGenerator.ts
- [ ] T023 [P] [US1] Implement PolygonDecomposer utility for obstacle footprint extraction in src/simulation/ai/pathfinding/navmesh/PolygonDecomposer.ts
- [ ] T024 [US1] Extend NavMeshGenerator to handle wall obstacles (subtract from walkable area) in src/simulation/ai/pathfinding/navmesh/NavMeshGenerator.ts
- [ ] T025 [US1] Extend NavMeshGenerator to handle cylindrical pillar obstacles (inflate and subtract) in src/simulation/ai/pathfinding/navmesh/NavMeshGenerator.ts
- [ ] T026 [US1] Implement convex polygon decomposition algorithm in src/simulation/ai/pathfinding/navmesh/PolygonDecomposer.ts
- [ ] T027 [US1] Implement AStarSearch.findPath() using navmesh library in src/simulation/ai/pathfinding/search/AStarSearch.ts
- [ ] T028 [US1] Implement Heuristics.euclideanDistance() for A* cost estimation in src/simulation/ai/pathfinding/search/Heuristics.ts
- [ ] T029 [US1] Create PathfindingSystem ECS system in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [ ] T030 [US1] Implement PathfindingSystem.calculatePath() wrapper for navmesh library in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [ ] T031 [US1] Implement PathfindingSystem.execute() to query robots needing recalculation in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [ ] T032 [US1] Add PathfindingSystem to ECS world registration in src/simulation/systems.ts
  (NOTE: systems.ts is existing ECS orchestration file - register pathfinding alongside targeting,
  combat, movement systems)
- [ ] T033 [US1] Implement event-driven path invalidation on obstacle spawn events in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [ ] T034 [US1] Add performance instrumentation (performance.now() timing) in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [ ] T035 [US1] Add error handling with PathfindingError types in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - robots navigate around obstacles without getting stuck

---

## Phase 4: User Story 2 - Smooth Natural Movement Paths (Priority: P2) ✅ COMPLETE

**Goal**: Robots follow smooth, natural-looking paths with curves around obstacles rather than zigzag grid patterns

**Independent Test**: Observe robot navigating across arena. Verify paths curve smoothly around obstacles with minimal sharp turns.

### Tests for User Story 2 (TDD Required)

- [X] T036 [P] [US2] Unit test: StringPuller reduces waypoint count by >50% in tests/simulation/ai/pathfinding/smoothing/StringPuller.test.ts
- [X] T037 [P] [US2] Unit test: StringPuller maintains path validity (all waypoints walkable) in tests/simulation/ai/pathfinding/smoothing/StringPuller.test.ts
- [X] T038 [P] [US2] Unit test: PathOptimizer ensures heading changes <5° between segments in tests/simulation/ai/pathfinding/smoothing/PathOptimizer.test.ts
- [X] T039 [US2] Integration test: Paths around pillar form smooth arcs not rectangles in tests/integration/pathfinding-smoothing.test.ts
- [X] T040 [US2] Contract test: Smoothed path length ≤110% of pre-smoothed length in tests/simulation/ai/pathfinding/smoothing/StringPuller.test.ts

### Implementation for User Story 2

- [X] T041 [P] [US2] Integrate navmesh funnel algorithm wrapper in src/simulation/ai/pathfinding/smoothing/StringPuller.ts
- [X] T042 [P] [US2] Implement PathOptimizer.smoothPath() to apply funnel algorithm in src/simulation/ai/pathfinding/smoothing/PathOptimizer.ts
- [X] T043 [US2] Extend PathfindingSystem.calculatePath() to apply path smoothing in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T044 [US2] Add heading smoothness validation (max 5° turns) in src/simulation/ai/pathfinding/smoothing/PathOptimizer.ts
- [X] T045 [US2] Add path optimality validation (≤110% shortest) in src/simulation/ai/pathfinding/smoothing/PathOptimizer.ts

**Checkpoint**: ✅ At this point, User Stories 1 AND 2 should both work - robots navigate smoothly with curved paths

---

## Phase 5: User Story 3 - Efficient Pathfinding Performance (Priority: P3) ✅ COMPLETE

**Goal**: Pathfinding operates efficiently with minimal computational overhead for 20 robots without frame drops

**Independent Test**: Run 10v10 match with all robots calculating paths simultaneously. Verify 60fps maintained with pathfinding <10% CPU.

### Tests for User Story 3 (TDD Required)

- [X] T046 [P] [US3] Performance test: 20 robots all calculate paths simultaneously in <16ms total in tests/simulation/ai/pathfinding/performance.test.ts
- [X] T047 [P] [US3] Performance test: Individual path calculation <5ms in 95% of cases in tests/simulation/ai/pathfinding/performance.test.ts
- [X] T048 [P] [US3] Memory test: Total pathfinding memory usage <5MB sustained in tests/simulation/ai/pathfinding/memory.test.ts
- [X] T049 [P] [US3] Stress test: Path recalculation on dynamic obstacle completes <100ms in tests/simulation/ai/pathfinding/performance.test.ts
- [X] T050 [US3] Contract test: PathCache achieves >80% hit rate for repeated queries in tests/simulation/ai/pathfinding/search/PathCache.test.ts

### Implementation for User Story 3

- [X] T051 [P] [US3] Implement PathCache with LRU eviction in src/simulation/ai/pathfinding/search/PathCache.ts
- [X] T052 [P] [US3] Implement cache key generation from start/target positions in src/simulation/ai/pathfinding/search/PathCache.ts
- [X] T053 [US3] Integrate PathCache into PathfindingSystem.calculatePath() in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T054 [US3] Add memory tracking in NavMeshResource.metrics in src/simulation/ai/pathfinding/integration/NavMeshResource.ts
- [X] T055 [US3] Implement recalculation throttling (max 3/sec per robot) in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T056 [US3] Add performance metrics tracking (avg calculation time, cache hit rate) in src/simulation/ai/pathfinding/integration/NavMeshResource.ts
- [X] T057 [US3] Implement frame budget enforcement (defer if >2.4ms used) in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T058 [US3] Add memory profiling instrumentation in src/simulation/ai/pathfinding/integration/NavMeshResource.ts

**Checkpoint**: ✅ All user stories should now be independently functional with performance targets met

---

## Phase 6: Edge Cases & Error Handling

**Purpose**: Handle edge cases identified in specification

- [X] T059 [P] Unit test: No path exists → robot moves to nearest accessible point in tests/simulation/ai/pathfinding/edge-cases.test.ts
- [X] T060 [P] Unit test: Narrow passage → robots queue without clustering in tests/integration/pathfinding-narrow-passage.test.ts
- [X] T061 [P] Unit test: Path recalculation timeout (>100ms) → fallback to stale path in tests/simulation/ai/pathfinding/edge-cases.test.ts
- [X] T062 [P] Unit test: Robot spawns in corner → initial path includes maneuvering in tests/simulation/ai/pathfinding/edge-cases.test.ts
- [X] T062a Implement nearest accessible point finder algorithm in
  src/simulation/ai/pathfinding/search/NearestAccessiblePoint.ts (for FR-006: when no path exists,
  calculate closest walkable location using distance-to-NavMesh query)
- [X] T063 Integrate nearest accessible point fallback into PathfindingSystem (call
  NearestAccessiblePoint when A* returns null) in
  src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T064 Implement timeout handling (>100ms) with stale path fallback in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T065 Implement narrow passage detection and queueing logic in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [X] T066 Add error logging for pathfinding failures (no path, timeout, invalid geometry) and
  degraded behavior flags in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts

**Checkpoint**: ✅ Edge cases handled with graceful fallbacks and error recovery

---

## Phase 7: Observability & Debug Tooling ✅

**Purpose**: Add instrumentation and visualization for debugging  
**Status**: COMPLETE (2025-01-XX)

- [x] T067 [P] Implement structured telemetry logging for path calculation events
  (start/complete, timing, cache hits) in
  src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [x] T068 [P] Add debug visualization component for NavMesh polygons in src/visuals/debug/NavMeshDebugger.tsx
- [x] T069 [P] Add debug visualization component for active paths in src/visuals/debug/PathDebugger.tsx
- [x] T070 Add metrics export to NavMeshResource (averageCalculationTime, cacheHitRate, etc.) in src/simulation/ai/pathfinding/integration/NavMeshResource.ts
- [x] T071 Create toggle for debug visualization (DEBUG env var check) in src/App.tsx

**Test Results**: 15/15 tests passing (5 observability + 4 NavMeshDebugger + 6 PathDebugger)  
**Checkpoint**: All 42 pathfinding tests passing (27 prior + 15 Phase 7)

---

## Phase 8: Integration & AI Behavior Coordination

**Purpose**: Integrate pathfinding with existing AI systems using concurrent execution model

- [ ] T072 Unit test: Pathfinding outputs movement desire vector (not direct position update) in tests/simulation/ai/pathfinding/integration/PathfindingSystem.test.ts
- [ ] T073 Refactor PathfindingSystem to emit movement desire instead of direct movement in src/simulation/ai/pathfinding/integration/PathfindingSystem.ts
- [ ] T074 Integrate pathfinding desire with existing AI behavior blending system in src/simulation/ai/coordination/BehaviorBlender.ts
- [ ] T075 Define weighted blending priorities (retreat > combat > pathfinding > idle) in src/simulation/ai/coordination/BehaviorBlender.ts
- [ ] T076 Integration test: Pathfinding blends correctly with combat behavior in tests/integration/ai-behavior-blending.test.ts

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T077 [P] Update AGENTS.md with pathfinding architecture overview in AGENTS.md
- [ ] T078 [P] Update README.md with pathfinding feature documentation in README.md
- [ ] T079 [P] Add TypeScript documentation comments to all public APIs in src/simulation/ai/pathfinding/
- [ ] T080 Code review: Verify all source files <300 LOC (constitution compliance)
- [ ] T081 Code review: Verify all tests written before implementation (TDD compliance)
- [ ] T082 Run all tests: npm run test
- [ ] T083 Run E2E tests: npm run playwright:test
- [ ] T084 Profile memory usage with 20 robots, verify <5MB budget
- [ ] T085 Profile performance with 20 robots, verify <5ms P95 path calculation
- [ ] T086 [P] Run quickstart.md validation workflow
- [ ] T087 Evaluate reactive steering system (src/simulation/ai/pathing/avoidance.ts) for deprecation
- [ ] T088 Plan migration path from reactive steering to NavMesh pathfinding

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Edge Cases (Phase 6)**: Depends on US1 completion (core pathfinding must work first)
- **Observability (Phase 7)**: Can run in parallel with US2/US3, depends on US1
- **Integration (Phase 8)**: Depends on US1 completion (core pathfinding must work first)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 core implementation (T022-T035) - Extends US1 paths with smoothing
- **User Story 3 (P3)**: Can start after US1 core implementation (T022-T035) - Adds caching and
  performance optimization to US1

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Core pathfinding (US1) before smoothing (US2)
- Core pathfinding (US1) before performance optimization (US3)
- Unit tests before integration tests
- Contract tests validate performance guarantees after implementation

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T005)
- All Foundational type definitions [P] can run in parallel (T006-T009)
- All US1 tests marked [P] can run in parallel (T013-T019)
- All US1 implementation tasks marked [P] can run in parallel (T022-T023, T027-T028)
- All US2 tests marked [P] can run in parallel (T036-T038)
- All US2 implementation tasks marked [P] can run in parallel (T041-T042)
- All US3 tests marked [P] can run in parallel (T046-T050)
- All US3 implementation tasks marked [P] can run in parallel (T051-T052)
- All Edge Case tests marked [P] can run in parallel (T059-T062)
- All Observability tasks marked [P] can run in parallel (T067-T069, T077-T079)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD phase):
Task T013: "Unit test: NavMeshGenerator empty arena"
Task T014: "Unit test: NavMeshGenerator single wall"
Task T015: "Unit test: NavMeshGenerator multiple pillars"
Task T016: "Unit test: AStarSearch straight-line path"
Task T017: "Unit test: AStarSearch path around wall"
Task T018: "Integration test: PathfindingSystem calculates path"
Task T019: "Integration test: Robot navigates wall cluster"

# Then launch parallel implementation tasks after tests fail:
Task T022: "Implement NavMeshGenerator empty arena"
Task T023: "Implement PolygonDecomposer utility"
Task T027: "Implement AStarSearch.findPath()"
Task T028: "Implement Heuristics.euclideanDistance()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (T013-T035)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Robot navigates around obstacles
   - No getting stuck in corners
   - Paths avoid walls/pillars correctly
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: Basic navigation works!)
3. Add User Story 2 → Test independently → Deploy/Demo (Paths now smooth and natural!)
4. Add User Story 3 → Test independently → Deploy/Demo (Performance optimized for 20 robots!)
5. Add Edge Cases → Robust error handling
6. Add Observability → Debugging and metrics
7. Add Integration → Full AI behavior coordination
8. Polish → Production ready

### Parallel Team Strategy

With multiple developers after Foundational phase:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T013-T035)
   - Developer B: User Story 2 (T036-T045) - starts after US1 T022-T035 done
   - Developer C: User Story 3 (T046-T058) - starts after US1 T022-T035 done
   - Developer D: Observability (T067-T071) - can start after US1 basics work
3. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 90
- **User Story 1 (P1)**: 23 tasks (T013-T035)
- **User Story 2 (P2)**: 10 tasks (T036-T045)
- **User Story 3 (P3)**: 13 tasks (T046-T058)
- **Edge Cases**: 8 tasks (T059-T066)
- **Observability**: 5 tasks (T067-T071)
- **Integration**: 5 tasks (T072-T076)
- **Polish**: 12 tasks (T077-T088)
- **Parallel Opportunities**: 35 tasks marked [P] (40% parallelizable)

### MVP Scope (Recommended)

- Phase 1: Setup (5 tasks)
- Phase 2: Foundational (7 tasks)
- Phase 3: User Story 1 (23 tasks)
- Phase 6: Edge Cases (1 critical task: T062a)
- **Total MVP**: 36 tasks

### Suggested Timeline

- MVP (US1 only): 1-2 weeks
- With US2 (smooth paths): 2-3 weeks
- With US3 (performance): 3-4 weeks
- Production ready (all phases): 4-5 weeks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- TDD is MANDATORY per constitution - verify tests fail before implementing
- All source files MUST be <300 LOC per constitution
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Contract tests validate performance guarantees (<5ms P95, <2.4ms system execution)
