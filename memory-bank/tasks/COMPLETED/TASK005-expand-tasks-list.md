# TASK005 - Expand tasks list

**Status:** Completed
**Added:** 2025-09-17
**Updated:** 2025-09-17

**Goal:** Audit repository for missing tasks (bugs, improvements, test gaps) and add them to the tasks index.

**Acceptance criteria:**

- An updated `memory-bank/tasks/_index.md` containing the new tasks and statuses.
- Each new task file follows the TASK file template.

## Work performed

- Scanned repository for TODO/FIXME markers and reviewed `src/` and `tests/` to identify gaps.
- Created task files for discovered work: `TASK009` (FX system scaffold) and `TASK010` (projectile pooling & performance profiling).
- Updated `memory-bank/tasks/_index.md` to add pending tasks and move this task to Completed.

## Progress Log

### 2025-09-17

- Performed grep scan for TODO markers and inspected `src/components/Simulation.tsx` and `src/systems/ProjectileSystem.ts`.
- Added `TASK009` and `TASK010` to the tasks folder and updated the task index.
- Marked TASK005 as Completed.
