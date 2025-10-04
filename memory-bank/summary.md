# Memory Bank Summary — RobotSpaceBattler

**Last updated:** 2025-10-03

This summary indexes the canonical project context files and describes their purpose. Keep this file brief — the authoritative content is in the individual files now managed under `.specify/`.

## Purpose

Provide a consistent, minimal index for agent memory describing the core documents used to resume work on the project.

## Core files

- `projectbrief.md` — project purpose, scope, and contribution guidance.
- `productContext.md` — why the product exists and user experience goals.
- `activeContext.md` — current priorities, recent changes, next steps.
- `systemPatterns.md` — architecture notes and recommended patterns (look here for details on `useFixedStepLoop`, `physicsSyncSystem`, and render-key utilities).
- `techContext.md` — tech stack, dev setup, and runtime constraints.
- `progress.md` — short progress report and remaining work.
- `tasks/_index.md` — master list of tasks and statuses (folder: `tasks/`).

If you update any of the core documents above, update their `Last updated` date and add one-line notes in `progress.md` and `activeContext.md` describing the change. Prioritize checking `useFixedStepLoop`, on-demand rendering, and `Physics` provider settings when reflecting runtime or architectural changes.
