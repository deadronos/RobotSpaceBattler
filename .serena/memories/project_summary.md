RobotSpaceBattler — Project Summary (updated)

Purpose:
- Lightweight 3D robot arena battler simulation for deterministic AI and physics experiments and small-game prototyping.

Key responsibilities & architecture (explicit references):
- Renderer & scene: `src/components/Scene.tsx` creates the Three.js `Canvas` and wraps `Simulation` with `Physics` (Rapier).
- Simulation: `src/components/Simulation.tsx` contains the deterministic fixed-step loop and per-frame systems (AI, movement, weapons). Notable exported/test symbols: `FIXED_TIMESTEP` (1/60), `DETERMINISTIC_SEED` (12345), `__testFixedStepHandle`, `__testGetFixedStepHandle`, and `__testSimulationInstrumentationHook` which are used by the test suite for manual stepping and instrumentation.
- ECS & world model: `src/ecs/miniplexStore.ts` provides helpers and APIs such as `createRobotEntity`, `resetWorld`, `worldController`, `entityLookup`, `getRenderKey`, `setPauseVel`/`getPauseVel`.
- UI state: `src/store/uiStore.ts` exposes `useUI()` (Zustand) and `UIState` for flags like `paused`, `showFx`, and `friendlyFire`.
- Entrypoints: `src/main.tsx` -> `src/App.tsx` -> `src/components/Scene.tsx` -> `src/components/Simulation.tsx`.

Notes & authoritative rules:
- Physics-first authority: Rapier `RigidBody` is authoritative for transforms; systems sync mesh transforms from Rapier (see `physicsSyncSystem` and `physicsAdapter` in `Simulation.tsx`).
- Deterministic simulation: uses `useFixedStepLoop` with constants `DETERMINISTIC_SEED = 12345` and `FIXED_TIMESTEP = 1/60` to keep behavior deterministic for tests.
- Testing hooks: `Simulation.tsx` exposes test handles for manual stepping and instrumentation (see `__testFixedStepHandle`, `__testSimulationInstrumentationHook`).

Files to inspect for behavior changes:
- `src/components/Simulation.tsx` (lines containing constants, fixed-step loop, systems invocation)
- `src/ecs/miniplexStore.ts` (entity creation, reset, and helper APIs)
- `src/store/uiStore.ts` (Zustand store and API surface)
