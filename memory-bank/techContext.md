# Tech Context — RobotSpaceBattler

**Last updated:** 2025-10-05

## Technologies

- React + TypeScript
- Vite
- @react-three/fiber (Three.js)
- @react-three/rapier (physics)
- miniplex (ECS)
- zustand (UI state)
- Vitest (unit tests)
- Playwright (E2E)

## Development setup

- Dev server: `npm run dev` (Vite). Default local port: 5173.
- Playwright smoke E2E: Playwright config uses a `webServer` that starts the
  app on port 5174 for CI runs; use `npm run playwright:install` then
  `npm run playwright:test` (or `npx playwright test`).
- Lint: `npm run lint` (ESLint)
- Format: `npm run format` (Prettier)
- Build: `npm run build`
- Test: `npm run test`, `npm run test:watch` (Vitest)

## Runtime & performance notes

- Rendering is configured for on-demand updates (`frameloop="demand"`) and
  the app uses a small `TickDriver` to schedule frames only when the
  simulation is active. `TickDriver` batches invalidations to a target hz
  (default 60) and reports simple RAF metrics used by diagnostics.
- Physics is supplied by Rapier using the `<Physics />` provider with
  `updateLoop="independent"` and a fixed `timeStep` (1/60 by default) to
  stabilize behavior across machines. See `src/components/Scene.tsx` for exact
  wiring.
- The deterministic simulation driver (`useFixedStepLoop`) provides a seeded
  RNG per tick and a consistent step duration (the code uses
  `DETERMINISTIC_SEED = 12345` and `FIXED_TIMESTEP = 1 / 60`).

## Constraints & conventions

- Rapier `RigidBody` is authoritative for transforms. Systems should read from
  physics where applicable and avoid mutating mesh transforms directly when a
  `RigidBody` exists.
- Prefer small, testable system units; export helpers for unit testing without Three.js or Rapier.

## Tests & files of interest

- Key unit tests live under `tests/` (examples):
  - `tests/unit/useFixedStepLoop.test.tsx` — covers the hook and its test-mode behavior.
  - `tests/unit/rendering_diagnostics.test.tsx` — exercises instrumentation surfaces and metrics exposed by the simulation.
  - `tests/pause/pauseResume.test.ts` — validates pause/resume handling on `FixedStepDriver`.
- Playwright smoke tests are in `playwright/tests/` and rely on the
  `webServer` configuration to start a dev server on port 5174 for CI runs.
