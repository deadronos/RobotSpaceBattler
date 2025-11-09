# Tasks: AI Roaming & Wall-Awareness

**Feature**: 004-ai-roaming-wall-awareness  
**Status**: Implemented (backfilled tasks to match existing code/tests)

## Tasks

- [x] T001 Update `RobotAIState` in `src/ecs/world.ts` to include `roamTarget` and `roamUntil` for roaming state.
- [x] T002 Implement LOS timeout and roaming target selection in `src/ecs/systems/aiSystem.ts` using `ENGAGE_MEMORY_TIMEOUT_MS` and `ARENA_BOUNDS`.
- [x] T003 Implement wall and pillar avoidance in `src/simulation/ai/pathing.ts` using `ARENA_WALLS`, `ARENA_PILLARS`, `ROBOT_RADIUS`, `AVOIDANCE_RADIUS`, and `AVOIDANCE_STRENGTH`.
- [x] T004 Add unit test in `tests/ai/aiSystem.spec.ts` validating LOS timeout clears stale targets and sets a roam target.
- [x] T005 Add unit test in `tests/ai/pathing.spec.ts` validating avoidance pushes robots away from nearby walls.

## Constitution Check

- Component & Size: Changes implemented as small, focused updates to existing systems.
- Test-First: Behavior covered by dedicated tests (T004, T005).
- Separation: Pathing and AI behavior remain pure/system-based; rendering unaffected.
