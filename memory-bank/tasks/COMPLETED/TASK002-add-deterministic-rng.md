# TASK002 - Add deterministic RNG helper

**Status:** Completed
**Added:** 2025-09-15
**Updated:** 2025-09-15

## Original Request

Create a seeded RNG utility so simulations and tests can be deterministic when needed.

## Thought Process

A simple function returning a repeatable pseudo-random sequence enables deterministic simulations. The Mulberry32 algorithm is small and sufficient.

## Implementation Plan

- Implement RNG utility with a seedable interface.
- Write unit tests demonstrating repeatable sequences.

## Progress Tracking

**Overall Status:** Completed - 100%

### Subtasks

| ID  | Description           | Status   | Updated    | Notes |
| --- | --------------------- | -------- | ---------- | ----- |
| 2.1 | Implement RNG utility | Complete | 2025-09-15 |       |
| 2.2 | Add unit tests        | Complete | 2025-09-15 |       |

## Progress Log

### 2025-09-15

- Created `src/utils/seededRng.ts` with Mulberry32 implementation.
- Added `tests/seededRng.test.ts` verifying deterministic sequences.
