# Active Context

**Created:** 2025-10-17

Current work focus
- Branch: `002-3d-simulation-graphics` — simulation and graphics improvements
- Improving physics-sync, performance-sensitive FX, and determinism around weapon events

Recent changes
- AI, PhysicsSync and Weapons designs captured under `memory-bank/designs/`
- Tests and Playwright suites under `tests/` and `playwright/` validate core flows

Next steps
1. Ensure memory-bank core files exist (this update)
2. Add short how-to entries for running tests and dev server in `memory-bank/README.md`
3. Add tasks entries for known issues in `memory-bank/tasks/_index.md`
4. Add short run/how-to notes for contributors (dev, test, and E2E) in this file

Active decisions

- Keep Rapier as authoritative transform source; do not mutate mesh transforms when `rigid` exists
- Favor pure functions in systems for testability

How to run (short)

- Dev server: `npm run dev` (Vite)
- Unit tests: `npm run test` (Vitest)
- Playwright E2E: `npm run playwright:test` (run after `npx playwright install`)

Where to look next

- `tasks/_index.md` — current tasks and statuses
- `designs/` — design documents for AI, weapons, and physics-sync
- `specs/` — feature-level plans and acceptance criteria
