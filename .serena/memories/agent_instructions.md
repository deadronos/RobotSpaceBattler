Agent instructions for RobotSpaceBattler (detailed)

- Quick orientation:
  - Tech: React + TypeScript + Vite + react-three-fiber (three.js) + @react-three/rapier.
  - ECS: miniplex (`src/ecs/miniplexStore.ts`) and UI state in `src/store/uiStore.ts` (zustand).
  - Entry points: `src/main.tsx` -> `src/App.tsx` -> `src/components/Scene.tsx` -> `src/components/Simulation.tsx`.

- What to know first:
  - Renderer: `src/components/Scene.tsx` creates the Three.js `Canvas` and wraps `Simulation` with `Physics`.
  - Simulation: `src/components/Simulation.tsx` contains the game simulation, robot spawner and per-frame systems (AI, movement, weapons).
  - ECS & physics: miniplex stores component bags; Rapier `RigidBody` is authoritative for physics updates. See `SPEC.md` for the intended authority model.

- Developer workflows (explicit commands):
  - `npm install` - install deps
  - `npm run dev` - dev server (Vite, default port 5173)
  - `npm run build` - build
  - `npm run test` - unit tests (Vitest)
  - `npm run playwright:install` && `npm run playwright:test` - E2E
  - `npm run lint`, `npm run format` - lint & format

- Project-specific conventions & patterns:
  - One-file entry systems: high-level systems live under `src/components/Simulation.tsx`.
  - Physics-first transforms: use Rapier RigidBody as the source of truth; avoid directly mutating mesh transforms.
  - Tests: Vitest for unit tests; Playwright smoke test expects dev server on port 5174.

- Editing & testing notes for agents:
  - Hot-reload friendly: modify components and use `npm run dev` to see changes.
  - When changing physics or ECS code, run unit tests and Playwright smoke to catch regressions.
  - For non-trivial changes, update `SPEC.md` and add focused tests.

- Limitations / non-discoverable items:
  - Procedural robots are placeholders; glTF replacement planned.
  - No global RNG helper for deterministic tests yet; create one if needed.

- When in doubt: follow `SPEC.md` for system responsibilities and design intent.
