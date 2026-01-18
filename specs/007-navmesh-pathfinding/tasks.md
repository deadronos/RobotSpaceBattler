# Tasks: NavMesh Pathfinding (Spec 007)

**Goal**: Keep Spec 007 aligned to the repository’s current state.

## Current State Summary

- The NavMesh pathfinding library exists under `src/simulation/ai/pathfinding/` and is integrated into the runtime via `PathfindingSystem` and the `BehaviorBlender`.
- Unit + integration tests exist under `tests/simulation/ai/pathfinding/` and `tests/integration/` (narrow passage, smoothing, cache, performance).
- Runtime movement planning now blends NavMesh path following with existing steering behavior; reactive steering remains as a fallback when no valid path exists.

## Spec/Docs Alignment (done)

- [x] T001 Align spec.md to “implemented library and integrated into runtime (behavior blending + PathfindingSystem)”. 
- [x] T002 Align contracts/pathfinding-api.md to current API surface.
- [x] T003 Align plan.md to the actual file layout and constraints.
- [x] T004 Align data-model.md to the actual exported types/components.
- [x] T005 Align quickstart.md to “use what exists” (tests + minimal example).
- [x] T006 Replace research.md with a concise, current decision record.

## Validation (recommended)

- [ ] T010 Run unit/integration tests: `npm run test`.
- [ ] T011 Run typecheck: `npm run typecheck`.
- [ ] T012 Run lint: `npm run lint`.
- [ ] T013 Run formatter (markdown + src): `npm run format`.

## Gameplay Integration (status)

These tasks track the runtime integration and observability of pathfinding.

- [x] T020 Choose integration point for path-following (integration point chosen and implemented in `src/simulation/ai/pathing/` and `PathfindingSystem`).
- [x] T021 Create an adapter that:
  - requests a path (via `PathComponent` and `PathfindingSystem`)
  - converts `NavigationPath.waypoints` into movement desires/velocities
  - falls back to the current reactive steering when no valid path exists
- [~] T022 Decide how to keep NavMesh inputs in sync with arena obstacles (short-term rebuild-on-change implemented; longer-term dynamic invalidation/partial rebuild is an open follow-up).
- [ ] T023 Add a UI/debug toggle for `NavMeshDebugger` + `PathDebugger` in the existing debug UI (pending).
- [ ] T024 Pathfinding refactor & telemetry (tracked in `memory-bank/tasks/TASK003-pathfinding-refactor-and-telemetry.md`).

## Notes

- This file tracks what is true in the repo today; it is not a historical “everything was done” log.
- Performance targets should be treated as requirements to validate with `npm run test`, not as
  assumptions baked into documentation.
