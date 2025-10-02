# [TASK016] - Refactor Simulation: extract tick driver & bootstrap

**Status:** In Progress  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

## Original Request
Refactor `src/components/Simulation.tsx` to extract the deterministic tick loop, spawn/initialization bootstrap, and pause handling into small, testable hooks/modules so the component becomes primarily wiring and rendering.

## Thought Process
- `Simulation.tsx` currently mixes initialization, per-frame logic, pause velocity capture/restore, and rendering. Splitting responsibilities will improve unit testability and make subsequent refactors safer.
- Prioritize a non-breaking, staged refactor: extract pure/testable parts first (fixed-step loop), then move bootstrap and pause handling behind a stable façade.

## Implementation Plan
- Create `useFixedStepLoop` hook that accepts deterministic config (seed, timestep) and calls provided system callbacks in order. Unit test this hook in isolation.
- Create `useSimulationBootstrap` hook to perform initial query.connect, spawn delay, and teardown logic currently in useEffect. Add safe cleanup and keep behavior identical.
- Move pause velocity capture/restore into `pauseManager` utility with small API: `capturePauseVel(world)` and `restorePauseVel(world)` and tests for expected state changes.
- Replace `Simulation` internals to call these hooks and keep JSX mapping of entities to render prefabs.
- Add unit tests that assert bootstrap runs once, unmount cleans up, and fixed-step loop invokes systems in deterministic order.

## Progress Tracking

**Overall Status:** In Progress - 60%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Implement `useFixedStepLoop` hook | Completed | 2025-10-02 | Hook + FixedStepDriver added; unit tests added |
| 1.2 | Implement `useSimulationBootstrap` hook | In Progress | 2025-10-02 | Hook added; tests added for bootstrap behavior |
| 1.3 | Implement `pauseManager` utility | Completed | 2025-10-02 | pauseManager added; unit tests added |
| 1.4 | Wire `Simulation` to new hooks & remove extracted code | In Progress | 2025-10-02 | Simulation now uses hooks; remaining cleanup & linting |
| 1.5 | Add/adjust unit tests & run Playwright smoke test | In Progress | 2025-10-02 | Unit tests added for driver, pauseManager, bootstrap; run CI/tests next |

## Progress Log
### 2025-10-02

- Task created and initial plan drafted.
- Marked task as In Progress and began initial implementation work.
- Added status updates to subtasks and started scaffolding design for `useFixedStepLoop` (deterministic tick driver).
- Updated task index to reflect progress.
### 2025-10-02

- Implemented `FixedStepDriver` and `useFixedStepLoop` hook; added deterministic driver unit tests.
- Implemented `pauseManager` with `capturePauseVel` / `restorePauseVel` and added unit tests validating capture/restore semantics.
- Implemented `useSimulationBootstrap` hook and added a test verifying bootstrap runs on mount and cleanup on unmount.
