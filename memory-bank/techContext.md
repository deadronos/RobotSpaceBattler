# Tech Context — RobotSpaceBattler

**Last updated:** 2025-10-03

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
- Playwright smoke E2E: Playwright config uses a `webServer` that starts the app on port 5174 for CI runs; use `npm run playwright:install` then `npm run playwright:test` (or `npx playwright test`).
- Lint: `npm run lint` (ESLint)
- Format: `npm run format` (Prettier)
- Build: `npm run build`
- Test: `npm run test`, `npm run test:watch` (Vitest)

## Runtime & performance notes

- Rendering is configured for on-demand updates (`frameloop="demand"`) and the app uses a small `TickDriver` to schedule frames only when the simulation is active. This reduces unnecessary GPU work and makes pause deterministic.
- Physics is supplied by Rapier using the `<Physics />` provider with `updateLoop="independent"` and a fixed `timeStep` (1/60 by default) to stabilize behavior across machines.
- The deterministic simulation driver (`useFixedStepLoop`) provides a seeded RNG per tick and a consistent step duration so unit tests can reproduce simulation traces.

## Constraints & conventions

- Rapier `RigidBody` is authoritative for transforms. Systems should read from physics where applicable and avoid mutating mesh transforms directly when a `RigidBody` exists.
- Prefer small, testable system units; export helpers for unit testing without Three.js or Rapier.

## Dependencies

- See `package.json` for the current dependency tree and exact versions.

## Port notes

- Local Vite dev server: 5173
- Playwright CI dev server (webServer): 5174
- Ensure CI uses Playwright's `webServer` configuration to start the app on the expected port.
