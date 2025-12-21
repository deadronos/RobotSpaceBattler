# Tasks: NavMesh Pathfinding (Spec 007)

**Goal**: Keep Spec 007 aligned to the repository’s current state.

## Current State Summary

- The NavMesh pathfinding library exists under `src/simulation/ai/pathfinding/`.
- Unit + integration tests exist under `tests/simulation/ai/pathfinding/` and `tests/integration/`.
- The library is not currently wired into the live movement loop; runtime movement planning is still
  reactive steering in `src/simulation/ai/pathing/`.

## Spec/Docs Alignment (done)

- [x] T001 Align spec.md to “implemented library, integration pending”.
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

## Gameplay Integration (pending / optional)

These tasks are intentionally not marked complete until the library is actually used in the
simulation’s movement planner.

- [ ] T020 Choose integration point for path-following (likely in `src/simulation/ai/pathing/`).
- [ ] T021 Create an adapter that:
  - requests a path (set `PathComponent.requestedTarget`, call `PathfindingSystem.execute(...)`)
  - converts current `NavigationPath.waypoints` into a movement desire/velocity
  - falls back to the current reactive steering when no valid path exists
- [ ] T022 Decide how to keep NavMesh inputs in sync with arena obstacles.
  - Short term: treat NavMesh as immutable and rebuild when the arena changes.
  - Longer term: dynamic obstacle invalidation / partial rebuild strategy.
- [ ] T023 Add a UI/debug toggle for `NavMeshDebugger` + `PathDebugger` in the existing debug UI.

## Notes

- This file tracks what is true in the repo today; it is not a historical “everything was done” log.
- Performance targets should be treated as requirements to validate with `npm run test`, not as
  assumptions baked into documentation.
