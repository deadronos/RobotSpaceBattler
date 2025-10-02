# [TASK017] - Refactor AISystem: queries & perception helpers

**Status:** Pending  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

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

**Overall Status:** Not Started - 0%

### Subtasks

| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 2.1 | Introduce miniplex queries for enemy candidates | Not Started | 2025-10-02 | Replace O(N) scans where possible |
| 2.2 | Extract perception helpers and LOS wrapper | Not Started | 2025-10-02 | Preserve `performLineOfSight` behavior |
| 2.3 | Extract state-transition pure functions | Not Started | 2025-10-02 | Unit testable without world/rapier mocks |
| 2.4 | Update `aiSystem` to apply returned commands | Not Started | 2025-10-02 | Preserve side-effect ordering |
| 2.5 | Add unit tests and update coverage | Not Started | 2025-10-02 | Tests for edge cases and deterministic RNG |

## Progress Log

### 2025-10-02

- Task created with plan and subtasks.
