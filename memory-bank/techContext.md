# Tech Context — RobotSpaceBattler

**Last updated:** 2025-09-20

## Technologies

- React + TypeScript
- Vite
- react-three-fiber (Three.js)
- @react-three/rapier (physics)
- miniplex (ECS)
- zustand (UI state)
- Vitest (unit tests)
- Playwright (E2E)

## Development setup

- Dev server: `npm run dev` (Vite). Default local port: 5173.
- Playwright smoke E2E: Playwright config uses `webServer` that starts the app on port 5174 for CI runs.
- Lint: `npm run lint` (ESLint)
- Format: `npm run format` (Prettier)
- Build: `npm run build`
- Test: `npm run test`, `npm run test:watch` (Vitest)

## Constraints & conventions

- Rapier `RigidBody` is authoritative for transforms. Systems should read from physics where applicable.
- Prefer small, testable system units and keep side-effecting code isolated.

## Dependencies

- See `package.json` for the full dependency list and exact versions used in this repository.

## Port notes

- Local Vite dev server: 5173
- Playwright CI dev server (webServer): 5174
- Ensure CI uses Playwright's `webServer` configuration to start the app on the expected port.
