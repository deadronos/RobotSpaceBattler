# [TASK018] - Refactor BeamSystem: owner resolution & raycasting simplification

**Status:** Completed
**Added:** 2025-10-02
**Updated:** 2025-10-03

## Original Request
Refactor `src/systems/BeamSystem.ts` to remove duplicate owner/entity resolution, avoid full-world scanning for raycast hits, and prefer physics-driven raycasts (Rapier) when available.

## Thought Process
- BeamSystem currently duplicates resolveEntity/resolveOwner and loops over all entities to test beam hits. This is a maintenance/perf problem. Using queries and Rapier queries (if provided) will be faster and clearer.
- Ensure behavior remains identical if Rapier is not present (fallback pure-logic raycast tested independently).

## Implementation Plan
- Add shared `ecsResolve` util with `resolveEntity`/`resolveOwner` used by BeamSystem and other systems. Add unit tests for these utilities.
- Replace world-entity scan in `performBeamRaycast` with either: (a) Rapier raycasts when `rapier` is supplied, or (b) a miniplex query for candidate targets (team filtering) plus the same geometric test. Encapsulate both paths behind a single helper function.
- Split BeamSystem into: (1) event handling to create/update beams, (2) tick processing for damage/expiry. Make each piece independently testable.
- Add tests to assert tick damage timing, owner removal behavior, and beam expiry.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 3.1 | Create shared ecsResolve utilities | Completed | 2025-10-03 | Shared resolver + unit tests added |
| 3.2 | Implement Rapier-backed raycast helper + fallback | Completed | 2025-10-03 | Rapier-first helper with query fallback |
| 3.3 | Split beam creation vs beam ticking | Completed | 2025-10-03 | Event processing + ticking exported |
| 3.4 | Add unit tests for damage ticks and expiry | Completed | 2025-10-03 | Extended beam tick + owner removal coverage |

## Progress Log
### 2025-10-02
- Task created and scoped.
### 2025-10-03
- Reviewed existing BeamSystem implementation and dependent tests.
- Planned shared entity/owner resolver utility and BeamSystem refactor structure (event handling vs ticking).
- Implemented `ecsResolve` helper with shared owner/entity lookup and updated dependent systems.
- Refactored BeamSystem into event/tick phases with Rapier-aware raycast helper and deterministic fallback.
- Expanded beam tick unit tests and added resolver coverage; all Vitest suites passing locally.
