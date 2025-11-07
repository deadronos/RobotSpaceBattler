# Memory Bank — quick reference

This folder is the canonical project memory bank used by contributors and automated agents. It captures project context, technical patterns, progress, and per-task notes.
Files of interest

- `projectbrief.md` — short project purpose and core goals
- `productContext.md` — product-level context and user goals
- `activeContext.md` — current work focus, recent changes, next steps, and active decisions
- `systemPatterns.md` — canonical system patterns and recommended practices
- `techContext.md` — tech stack, commands, and known constraints
- `progress.md` — short progress status and milestones
- `tasks/` — individual task files and `_index.md` (task registry)
- `designs/` — design artifacts (AI, weapons, physics-sync)

How to use

- Read `activeContext.md` first for the current focus and immediate next steps.
- Use `tasks/_index.md` to discover current and pending work. Open individual `TASKxxx` files to see thought process and progress logs.
- Add a new task by creating a `tasks/TASK###-short-name.md` file following the existing format and then update `_index.md`.

When to update the memory bank

- After making important architectural choices
- When adding or completing tasks (update `tasks/_index.md`)
- After finishing a spec or major implementation (add a brief entry in `progress.md`)

Notes for automated agents

- When asked to "update memory bank", check all files in this folder and update `_index.md`, `activeContext.md`, and `progress.md` as appropriate.

Short checklist for maintainers

- Confirm `tasks/_index.md` reflects task files in `tasks/`.
- Keep `activeContext.md` and `progress.md` short and actionable.
- Prefer specs in `specs/` for feature-level decisions.
# Memory Bank — quick reference

This folder is the canonical project memory bank used by contributors and automated
agents. It captures project context, technical patterns, progress, and per-task notes.

Files of interest

	decisions

How to use

- Read `activeContext.md` first for the current focus and immediate next steps.
-- Use `tasks/_index.md` to discover current and pending work. Open individual
	`TASKxxx` files to see thought process and progress logs.
-- Add a new task by creating a `tasks/TASK###-short-name.md` file following the
	existing format and then update `_index.md`.

When to update the memory bank

- After making important architectural choices
- When adding or completing tasks (update `tasks/_index.md`)
- After finishing a spec or major implementation (add a brief entry in
	`progress.md`)

Notes for automated agents

-- When asked to "update memory bank", check all files in this folder and update
	`_index.md`, `activeContext.md`, and `progress.md` as appropriate.
