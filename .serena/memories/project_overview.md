Project: RobotSpaceBattler

Purpose:
- Small 3D robot space-battle demo/game used for experimentation with WebGL/three.js, physics, ECS, and fast iteration in the browser.

Tech stack:
- TypeScript, React, Vite
- Three.js via @react-three/fiber (react-three-fiber)
- Physics: @react-three/rapier (Rapier WASM bindings)
- ECS: miniplex (lightweight entity-component store)
- State: zustand for small UI state
- Testing: Vitest for unit tests, Playwright for E2E

Entrypoints:
- `src/main.tsx` -> renders `App` in `index.html`
- `src/App.tsx` -> top-level app, includes controls and `Scene`
- `src/components/Scene.tsx` -> sets up Three.js `Canvas` and `Physics` wrapper
- `src/components/Simulation.tsx` -> game simulation loop, robot spawner, per-frame systems

Important folders/files:
- `src/components/` - UI and scene components (Scene, Simulation, Projectile, etc.)
- `src/ecs/` - ECS store helpers (`miniplexStore.ts`, `types.ts`)
- `src/robots/` - robot generation and factory (`RobotFactory.tsx`)
- `src/store/` - small zustand UI store (`uiStore.ts`)
- `src/systems/` - systems such as physics sync
- `tests/` - Vitest unit tests
- `playwright/tests/` - E2E smoke tests
- `SPEC.md`, `AGENTS.md`, `.github/copilot-instructions.md` (guides & design docs)

Platform notes:
- Project development is performed on Windows (PowerShell). Some convenience commands may require platform-specific syntax (e.g. setting env vars). Playwright tests expect a dev server on port 5174 by default per project docs.

Developer tip:
- Rapier `RigidBody` is authoritative for transforms. Avoid directly mutating mesh transforms when bodies are controlled by Rapier.
