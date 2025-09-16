# Tech Context — RobotSpaceBattler

## Technologies used

- React
- TypeScript
- Vite
- react-three-fiber (Three.js)
- @react-three/rapier (physics)
- miniplex (ECS)
- zustand (UI state)
- Vitest (unit tests)
- Playwright (E2E tests)

## Development setup

- Dev server: Vite (`npm run dev`), default port 5173
- Playwright smoke test expects dev server on port 5174
- Lint: ESLint (`npm run lint`)
- Format: Prettier (`npm run format`)
- Build: `npm run build`
- Test: `npm run test`, `npm run test:watch`

## Technical constraints

- Rapier RigidBody is authoritative for transforms
- ECS components should read from Rapier each frame
- No multiplayer networking in initial scope
- Focus on modular, testable systems

## Dependencies

- See `package.json` for full list

## Port documentation

- Vite dev server: 5173
- Playwright smoke test: 5174
- Ensure these are consistent in CI and documented here
