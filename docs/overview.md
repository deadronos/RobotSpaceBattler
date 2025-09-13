# RobotSpaceBattler Codebase Overview

## Overview

- 3D auto-battler prototype: two AI teams (10v10) moving via physics on a lit plane.
- Stack: TypeScript, React, react-three-fiber (Three.js), @react-three/rapier (physics), miniplex (ECS), zustand (UI), Vite, Vitest, Playwright, ESLint, Prettier.
- Authority model: Rapier RigidBody is the source of truth for transforms; systems set/read velocities, not mesh positions.

## Entry Flow

- `src/main.tsx`: boots React and mounts `App`.
- `src/App.tsx`: lays out fullscreen scene; includes a pause/resume button and a status HUD.
- `src/components/Scene.tsx`: creates the Three.js `Canvas`, lights, orbit controls; wraps `Simulation` in `Physics`.
- `src/components/Simulation.tsx`: spawns robots, holds the per-frame AI/steering loop, renders ground and robots.

## Simulation & ECS

- ECS store: `miniplex` `World<Entity>` inside `Simulation.tsx` with entities `{ id, team, position, rb? }`.
- Spawning: on mount, adds 10 red and 10 blue entities positioned in two clusters.
- AI loop: `useFrame` runs each tick (unless paused). For each entity with a `rb`:
  - Finds nearest enemy using `rb.translation()`.
  - Computes normalized direction and sets linear velocity via `rb.setLinvel({ x, y, z }, true)`.
- Rendering: maps ECS entities to `<Robot>` components, wiring back each RigidBody into the entity via `onRigidBodyReady`.

## Robots & Physics

- `src/robots/RobotFactory.tsx`: procedural “humanoid” composed of primitives inside a `<RigidBody colliders="capsule">`.
- Exposes the underlying Rapier API (`ref.current.rigidBody`) so AI can set velocities.
- Scene physics: `Scene` wraps `Simulation` with `<Physics gravity={[0, -9.81, 0]}>`.

## State & UI

- `src/store/uiStore.ts`: zustand store with `paused` and `togglePause()`.
- `App` renders a pause/resume button; `Simulation` respects `paused` to halt the AI loop.
- Status HUD (`#status`) shows a label used by tests.

## Tests & Tooling

- Unit (Vitest): `tests/Simulation.test.tsx` asserts the HUD text and button render. `tests/setup.ts` adds jsdom shims (e.g., `ResizeObserver`).
- E2E (Playwright): `playwright/tests/smoke.spec.ts` expects dev server on `http://localhost:5173`, checks the `canvas` and status text.
- Configs: `vite.config.ts` (react-swc plugin, port 5173), `vitest.config.ts` (jsdom, setup file); ESLint/Prettier at root.
- Agent docs: `AGENTS.md` and `.github/copilot-instructions.md` mirror structure, commands, and physics/ECS conventions.
- Dependencies: three/react-three, rapier bindings, miniplex, zustand; dev deps include Vitest/Playwright and React 19 types.

## How to Run

- Dev: `npm run dev` (visit `http://localhost:5173`).
- Build/preview: `npm run build` / `npm run preview`.
- Lint/format: `npm run lint` / `npm run format`.
- Unit tests: `npm run test` (coverage: `npm run test:coverage`).
- E2E: `npm run playwright:install` then `npm run playwright:test`.

## Extending Safely

- Add systems (targeting, weapons, projectiles) by:
  - Storing components on entities (e.g., `Health`, `Weapon`, `Target`) in the miniplex store.
  - Driving movement and firing via Rapier APIs (e.g., `setLinvel`, impulses, raycasts/sweeps for fast projectiles).
- Keep physics authoritative: avoid mutating mesh transforms directly when a `RigidBody` exists.
- For determinism/tests, consider a fixed-timestep tick and a seeded RNG utility used by AI systems.

