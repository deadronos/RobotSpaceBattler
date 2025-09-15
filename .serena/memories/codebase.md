# Codebase summary — RobotSpaceBattler

**Purpose**
A small WebGL/Three.js TypeScript demo/game used to prototype robot combat, physics, and ECS patterns.

**Tech stack**
- TypeScript, React, Vite
- Rendering: three.js via @react-three/fiber
- Physics: @react-three/rapier (Rapier/WASM)
- ECS: miniplex
- UI state: zustand
- Testing: Vitest (unit) + Playwright (E2E)

**Repository layout (important files/folders)**
- `src/main.tsx` — app bootstrap
- `src/App.tsx` — top-level app and UI layout
- `src/components/Scene.tsx` — Three.js `Canvas` and `Physics` wrapper
- `src/components/Simulation.tsx` — game simulation, spawner, and per-frame systems
- `src/ecs/miniplexStore.ts` — ECS store utilities
- `src/robots/robotPrefab.tsx` — robot factory/prefab generation
- `src/systems/` — systems: `BeamSystem.ts`, `DamageSystem.ts`, `HitscanSystem.ts`, `ProjectileSystem.ts`, `WeaponSystem.ts`
- `src/store/uiStore.ts` — small zustand UI store (pause, debug flags)
- `tests/` — Vitest unit tests (determinism and physics checks)
- `playwright/tests/` — E2E smoke tests (dev server expected on port 5174)

**Entry points & runtime notes**
- Dev server: `npm run dev` (Vite, default port 5173)
- Playwright smoke expects port 5174 (project conventions in docs)
- Rapier `RigidBody` is authoritative for transforms — systems should use RigidBody APIs to set velocities/poses.

**Developer workflows**
- `npm install`, `npm run dev`, `npm run test`, `npm run playwright:install && npm run playwright:test`
- Use `npm run lint` and `npm run format` before committing

**Where to look for common tasks**
- Simulation/game-loop: `src/components/Simulation.tsx`
- Scene & renderer wiring: `src/components/Scene.tsx`
- ECS patterns: `src/ecs/miniplexStore.ts` and `SPEC.md`

**Notes / TODOs**
- Add a global seeded RNG helper for deterministic tests (some tests already reference `utils/seededRng.ts`).
- Consider documenting the fixed port expectation for Playwright in `package.json` scripts or README.

Generated: 2025-09-15 (agent) — concise codebase memory for quick onboarding and agent use.
