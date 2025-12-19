# Memory Bank

This folder is the legacy project memory bank (distinct from the Spec Kit workflow).
It captures high-level context and working notes for contributors and automated agents.

The authoritative, feature-level artifacts live under `specs/`.

## Files of interest

- `projectbrief.md` — project purpose and core goals
- `productContext.md` — product-level context and user goals
- `activeContext.md` — current work focus, recent changes, and next steps
- `systemPatterns.md` — cross-cutting architecture patterns (ECS, AI, telemetry, quality)
- `techContext.md` — stack, commands, and constraints
- `progress.md` — concise status and milestones
- `tasks/` — per-task notes plus `tasks/_index.md`
- `designs/` — design snapshots for major subsystems

## How to use

- Read `activeContext.md` first.
- Use `tasks/_index.md` to discover current work.
- Prefer `specs/` when looking for “as implemented” feature documentation.

## When to update

- After meaningful architecture changes (AI, obstacles, rendering, performance)
- After finishing a spec alignment or implementing a feature
- When task status changes (update `tasks/_index.md` and the task file)
