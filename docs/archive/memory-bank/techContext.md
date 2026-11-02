# Tech Context

**Created:** 2025-10-17

Stack

- TypeScript + React
- Rendering: `@react-three/fiber` (Three.js)
- Physics: `@react-three/rapier` (Rapier)
- ECS: `miniplex`
- State: `zustand` for telemetry + debug/quality UI
- Pathfinding: `navmesh` (plus internal pathfinding modules under `src/simulation/ai/pathfinding/`)
- Tests: Vitest for unit tests, Playwright for E2E

Project commands

- `npm run dev` — Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run test` — Vitest
- `npm run test:coverage` — coverage run
- `npm run lint` / `npm run lint:fix` — ESLint for `src/`
- `npm run format` — Prettier (includes Markdown)
- `npm run typecheck` — TypeScript typecheck
- `npm run playwright:test` — Playwright E2E (after `playwright:install`)

Known constraints

- Determinism is best-effort: many tests use fixed inputs, but runtime uses `Date.now()` for seeds
  when not provided, and `TEAM_CONFIGS` uses `Math.random()` for spawn jitter on module init.
- Rapier types can be duplicated between direct `@dimforge/rapier3d-compat` usage and
  `@react-three/rapier`'s bundled version; some integrations use type assertions.
- Instancing toggle sources:
  - Query param: `?instancing=1` / `?instancing=true`
  - Env: `VITE_REACT_APP_VFX_INSTANCING` (or `REACT_APP_VFX_INSTANCING`)
- **Physics scale**: 1 world unit = 1 meter (1:1 scale).
