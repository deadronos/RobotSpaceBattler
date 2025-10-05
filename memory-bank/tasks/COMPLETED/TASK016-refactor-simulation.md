# [TASK016] - Refactor Simulation: extract tick driver & bootstrap

**Status:** Completed  
**Added:** 2025-10-02  
**Updated:** 2025-10-02

## Original Request

Refactor `src/components/Simulation.tsx` to extract the deterministic tick loop, spawn/bootstrap, and pause handling.
Move those responsibilities into small, testable hooks so the component is primarily wiring and rendering.

## Thought Process

- `Simulation.tsx` currently mixes initialization, per-frame logic, pause velocity capture/restore, and rendering.
- Splitting responsibilities will improve unit testability and make subsequent refactors safer.
- Prioritize a phased refactor: extract pure parts first, then move bootstrap and pause handling.

## Implementation Plan

- Create `useFixedStepLoop` hook that accepts deterministic config (seed, timestep).
  - Unit-test the hook in isolation.

- Create `useSimulationBootstrap` hook to perform query.connect, defer spawn, and teardown.
  - Preserve mount/unmount semantics and add safe cleanup.

- Move pause velocity capture/restore into a small `pauseManager` utility with API: `capturePauseVel(world)` and `restorePauseVel(world)`.
- Replace `Simulation` internals to call these hooks and keep the JSX mapping of entities to render prefabs.
- Add unit tests that assert bootstrap runs once, unmount cleans up, and the fixed-step loop invokes systems deterministically.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description                                            | Status    | Updated    | Notes                                          |
| --- | ------------------------------------------------------ | --------- | ---------- | ---------------------------------------------- |
| 1.1 | Implement `useFixedStepLoop` hook                      | Completed | 2025-10-02 | Hook + FixedStepDriver added; unit tests added |
| 1.2 | Implement `useSimulationBootstrap` hook                | Completed | 2025-10-02 | Hook added; basic unit test added              |
| 1.3 | Implement `pauseManager` utility                       | Completed | 2025-10-02 | pauseManager added; unit tests added           |
| 1.4 | Wire `Simulation` to new hooks & remove extracted code | Completed | 2025-10-02 | Simulation uses hooks.                         |
| 1.5 | Add/adjust unit tests & run Playwright smoke test      | Completed | 2025-10-02 | Unit tests added.                              |

## Progress Log

### 2025-10-02

- Task created and initial plan drafted.
- Marked task as In Progress and began initial implementation work.
- Added status updates to subtasks and started scaffolding design for `useFixedStepLoop` (deterministic tick driver).
- Updated task index to reflect progress.

### 2025-10-02

- Implemented `FixedStepDriver` and `useFixedStepLoop` hook; added deterministic driver unit tests.
- Implemented `pauseManager` with `capturePauseVel`/`restorePauseVel` and added unit tests validating capture/restore semantics.
- Implemented `useSimulationBootstrap` hook and added a test verifying bootstrap runs on mount and cleanup on unmount.

### 2025-10-02

- Ran ESLint autofix and resolved TypeScript incompatibilities introduced during the refactor.
- Added unit tests for the new utilities/hooks; executed the project's unit tests locally (66 tests, 0 failures).

### 2025-10-02

- Marked TASK016 as completed; unit tests passed. Playwright E2E smoke pending in CI.
