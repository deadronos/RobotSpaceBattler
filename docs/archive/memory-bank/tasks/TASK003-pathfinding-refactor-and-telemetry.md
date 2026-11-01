# TASK003 - PathfindingSystem Refactor & Telemetry

**Status:** In Progress  
**Added:** 2025-12-19

## Goal

Refactor `src/simulation/ai/pathfinding/integration/PathfindingSystem.ts` into smaller, testable components, add pathfinding telemetry, and reduce the file size (LOC) to improve maintainability.

## Motivation

- The Pathfinding integration file is large (~300+ LOC) and mixes concerns (request handling, caching, throttling, telemetry, path conversion). Splitting responsibilities will make it easier to test, reason about, and evolve.

## Implementation plan

- Extract a `PathCalculator` (pure-ish, ~100 LOC) to perform single path requests and expose metrics (time ms, node expansions).
- Extract `PathfindingTelemetry` for emitting/aggregating telemetry relevant to pathfinding (cache hits, path cost, smoothing reductions).
- Keep `PathfindingSystem.ts` lightweight: request routing, rate-limiting, and component updates.
- Add unit tests covering `PathCalculator` and `PathfindingTelemetry`.
- Add integration tests to validate the refactored system behavior remains the same.

## Subtasks

| ID  | Description                                    | Status      | Notes |
| --- | ---------------------------------------------- | ----------- | ----- |
| 3.1 | Extract `PathCalculator`                       | Not Started | Refer to `memory-bank/designs/loc-refactor-plan.md` |
| 3.2 | Create `PathfindingTelemetry` abstraction     | Not Started | Emits structured telemetry to `TelemetryPort` |
| 3.3 | Reduce `PathfindingSystem.ts` LOC to ≤ 200    | Not Started | Target <=200 LOC after extraction |
| 3.4 | Add tests for calculator and telemetry        | Not Started | Unit tests + integration coverage |
| 3.5 | Add debug toggle for NavMesh / Path Debuggers | Not Started | Implement UI toggle in debug panel |

## Acceptance criteria

- Tests pass (`npm run test`) and typecheck/lint succeed.
- `PathfindingSystem.ts` file size reduced and behavior unchanged (integration tests confirm).
- Telemetry surface exists and emits cache-hit / path-duration metrics.

## Related docs
- `memory-bank/designs/loc-refactor-plan.md`
- `specs/007-specify-scripts-bash/tasks.md` (integration tasks)
