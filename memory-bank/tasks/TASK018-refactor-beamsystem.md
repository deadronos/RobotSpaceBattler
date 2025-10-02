# [TASK018] - Refactor BeamSystem: owner resolution & raycasting simplification

**Status:** Pending  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

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

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 3.1 | Create shared ecsResolve utilities | Not Started | 2025-10-02 | Reuse in WeaponSystem as well |
| 3.2 | Implement Rapier-backed raycast helper + fallback | Not Started | 2025-10-02 | Maintain deterministic fallback behavior |
| 3.3 | Split beam creation vs beam ticking | Not Started | 2025-10-02 | Improve testability |
| 3.4 | Add unit tests for damage ticks and expiry | Not Started | 2025-10-02 | Use simNowMs injection for determinism |

## Progress Log
### 2025-10-02
- Task created and scoped.
