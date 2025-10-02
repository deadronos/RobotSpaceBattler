# [TASK017] - Refactor AISystem: queries & perception helpers

**Status:** Completed  
**Added:** 2025-10-02  
**Updated:** 2025-01-16

## Original Request
Refactor `src/systems/AISystem.ts` to reduce full-world scans and to separate perception from state-transition logic.
Extract pure helper functions so the system becomes easier to unit test.

## Thought Process

- The AISystem currently mixes scanning, LOS checks, movement, and state updates.
- Extract perception and decision helpers so transitions can be tested without Rapier or Three.js.
- Use miniplex queries to find candidate enemies and avoid repeated world scans.

- ## Implementation Plan

- Add query-based helpers (e.g., `queryEnemies(world, self)`) using miniplex to filter by team/alive.
- Extract `chooseNearestEnemy`, `shouldFlee`, and `engageBehavior` into pure functions that return compact command objects.
- Keep the public `aiSystem` as a thin orchestrator that applies commands to entity instances; test the pure functions thoroughly.
- Add unit tests that validate state transitions and behavior for edge cases (no target, LOS blocked, low health).

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 2.1 | Introduce miniplex queries for enemy candidates | Complete | 2025-01-16 | Created `src/systems/ai/queries.ts` with `queryEnemies` and `findNearestEnemy` |
| 2.2 | Extract perception helpers and LOS wrapper | Complete | 2025-01-16 | Created `src/systems/ai/perception.ts` with `canSeeTarget`, `isInRange`, etc. |
| 2.3 | Extract state-transition pure functions | Complete | 2025-01-16 | Created `src/systems/ai/decisions.ts` with all pure decision functions |
| 2.4 | Update `aiSystem` to apply returned commands | Complete | 2025-01-16 | Refactored AISystem to be thin orchestrator with `applyDecision` |
| 2.5 | Add unit tests and update coverage | Complete | 2025-01-16 | Added 58 new tests across 3 test files |

## Progress Log

### 2025-01-16

- Created `src/systems/ai/queries.ts` with query helpers:
  - `queryEnemies`: finds all living enemies sorted by distance
  - `findNearestEnemy`: convenience helper for nearest enemy
- Created `src/systems/ai/perception.ts` with perception helpers:
  - `canSeeTarget`: wraps LOS check with convenient interface
  - `isInRange`: checks if target is within weapon range
  - `getDistanceSquared`: calculates distance between entities
- Created `src/systems/ai/decisions.ts` with pure decision functions:
  - Health checks: `shouldFlee`, `shouldStopFleeing`
  - Velocity calculations: `calculateBackOffVelocity`, `calculateFleeVelocity`, `calculateWanderVelocity`
  - State decisions: `decideIdleAction`, `decidePatrolAction`, `decideEngageAction`, `decideFleeAction`
- Refactored `src/systems/AISystem.ts`:
  - Now uses query helpers instead of full world scans
  - Uses perception helpers for LOS checks
  - Uses pure decision functions for state machine logic
  - Thin orchestrator that applies decisions via `applyDecision`
- Added comprehensive unit tests:
  - `tests/ai-queries.test.ts` - 13 tests for query helpers
  - `tests/ai-decisions.test.ts` - 27 tests for decision functions
  - `tests/ai-perception.test.ts` - 18 tests for perception helpers
- All 124 tests pass (66 existing + 58 new)
- Build succeeds and linter passes

### 2025-10-02

- Task created with plan and subtasks.
