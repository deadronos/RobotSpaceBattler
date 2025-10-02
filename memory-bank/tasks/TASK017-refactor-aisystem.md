# [TASK017] - Refactor AISystem: queries & perception helpers

**Status:** Pending  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

## Original Request
Refactor `src/systems/AISystem.ts` to reduce full-world scans, separate perception and state transition logic, and make the system easier to unit test by extracting pure helpers.

## Thought Process
- The AISystem mixes scanning, LOS checks, movement, and state updates. Extracting perception and decision helpers allows unit tests for transitions without Rapier or Three.js.
- Use miniplex queries to find candidate enemies and avoid repeated Array.from(world.entities) scans.

## Implementation Plan
- Add query-based helpers (e.g., `queryEnemies(world, self)`) using miniplex to filter by team/alive.
- Extract `chooseNearestEnemy`, `shouldFlee`, and `engageBehavior` into pure functions that accept normalized inputs and return commands (move vector, targetId, firing boolean).
- Keep the public `aiSystem` as a thin orchestrator that applies commands to entity instances; test the pure functions thoroughly.
- Add unit tests that validate state transitions and behavior for edge cases (no target, LOS blocked, low health).

## Progress Tracking

**Overall Status:** Not Started - 0%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 2.1 | Introduce miniplex queries for enemy candidates | Not Started | 2025-10-02 | Replace O(N) scans where possible |
| 2.2 | Extract perception helpers and LOS wrapper | Not Started | 2025-10-02 | Keep behavior compatible with `performLineOfSight` |
| 2.3 | Extract state-transition pure functions | Not Started | 2025-10-02 | Unit testable without world/rapier mocks |
| 2.4 | Update `aiSystem` to apply returned commands | Not Started | 2025-10-02 | Maintain existing side-effects ordering |
| 2.5 | Add unit tests and update coverage | Not Started | 2025-10-02 | Tests for edge cases and deterministic RNG inputs |

## Progress Log
### 2025-10-02
- Task created with plan and subtasks.
