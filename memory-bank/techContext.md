# Tech Context

**Created:** 2025-10-17

Stack

- TypeScript + React
- Rendering: `@react-three/fiber` (Three.js)
- Physics: `@react-three/rapier` (Rapier)
- ECS: `miniplex`
- State: `zustand` for UI state
- Tests: Vitest for unit tests, Playwright for E2E

Project commands

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run test` — Vitest
- `npm run playwright:test` — Playwright E2E (after `playwright:install`)

Known constraints

- Rapier APIs differ between test harness and runtime — code is defensive
- Determinism requires avoiding Date.now()/Math.random() outside the seeded RNG
