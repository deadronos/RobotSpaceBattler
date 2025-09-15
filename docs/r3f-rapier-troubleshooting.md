# R3F + Rapier Troubleshooting (What We Fixed)

This document records the fixes we applied to make React Three Fiber (R3F) and `@react-three/rapier` initialize reliably in dev and build. It also captures the underlying causes so future changes don’t regress.

## Symptoms Observed

- Canvas crashed with: `R3F: Hooks can only be used within the Canvas component!`
- Physics crashed on mount with: `Cannot read properties of undefined (reading 'raweventqueue_new')`.
- Frequent Rapier runtime errors: “recursive use … unsafe aliasing in rust”, usually while removing bodies/colliders during collision callbacks.
- WebGL context lost loop and repeated “Physics render error …” spam.

## Root Causes and Fixes

1) R3F hooks called outside Canvas after an error
- Cause: When the Physics/Canvas crashed, our error boundaries rendered a component that still used R3F hooks (`useFrame`) outside a `<Canvas>`.
- Fixes:
  - `src/components/Scene.tsx`: Error boundaries now render `SimulationFallback` (no R3F hooks) instead of `Simulation`.
  - OrbitControls mounting is delayed one `requestAnimationFrame` after the Canvas is live to avoid a timing edge case where Drei tries to read the R3F store during the initial commit.

2) Rapier WASM mismatch and init ordering
- Cause: `@react-three/rapier@2.1.0` expects `@dimforge/rapier3d-compat@0.15.0`. A different version (0.15.1/0.19) was hoisted at root, and WASM wasn’t reliably initialized from inside node_modules.
- Fixes:
  - Pin and enforce compat version:
    - `package.json`: set `@dimforge/rapier3d-compat` to `0.15.0` and add `overrides` to force 0.15.0 everywhere (root and nested).
    - Remove `@dimforge/rapier3d` from deps.
  - Explicit WASM init:
    - `src/utils/preinitRapier.ts`: resolves `rapier_wasm3d_bg.wasm` via `?url` and calls `init({ module_or_path })` before importing `@react-three/rapier`.
    - `src/components/Scene.tsx`: calls `preinitRapier()` prior to `import('@react-three/rapier')`.
  - Vite hint to avoid duplicate module instances:
    - `vite.config.ts`: `optimizeDeps.include = ['@dimforge/rapier3d-compat']`.
  - TypeScript typing for WASM URL imports:
    - `src/vite-env.d.ts` declares `*.wasm` and `*.wasm?url` modules.

3) Rapier “unsafe aliasing” during collision callbacks
- Cause: Removing entities (and thus bodies/colliders) inside collision callbacks mutates the world during the physics step.
- Fixes:
  - Defer removal to the next frame:
    - `src/systems/projectileOnHit.ts`: mark projectile `ttl = 0` and call `markEntityDestroying`, do not remove immediately.
    - `src/systems/projectileCleanup.ts`: in the frame cleanup, mark and remove expired/out-of-bounds projectiles.
  - Defensive cleanup helpers: `src/utils/rapierCleanup.ts` clear stored Rapier refs before entity removal.

## Files Changed

- Fallbacks and Controls timing
  - `src/components/Scene.tsx`
  - `src/components/Simulation.tsx` (adds `SimulationFallback` usage in boundaries)

- Rapier init & typing
  - `src/utils/preinitRapier.ts`
  - `src/vite-env.d.ts`
  - `vite.config.ts`
  - `package.json` (pin + overrides)

- Safe projectile removal
  - `src/systems/projectileOnHit.ts`
  - `src/systems/projectileCleanup.ts`
  - `src/utils/rapierCleanup.ts`

## How to Reproduce and Verify

1) Clean install to honor overrides
- Delete `node_modules` and `package-lock.json`.
- `npm cache clean --force` (optional).
- `npm i`.

2) Dev server
- `npm run dev` and hard reload (Ctrl+F5).
- In DevTools Network: filter by “Wasm” and confirm `rapier_wasm3d_bg.wasm` loads (200).
- The yellow “Physics unavailable” banner should be gone; controls appear a moment after the scene mounts.

3) Behavioral checks
- No “Hooks can only be used within the Canvas” console errors.
- No Rapier “unsafe aliasing” spam when projectiles hit or despawn.

## Notes and Future-Proofing

- If upgrading `@react-three/rapier`, always confirm its pinned `@dimforge/rapier3d-compat` version and line up `package.json` + `overrides` accordingly.
- Keep `SimulationFallback` free of any R3F hooks; it’s the safe path when Canvas/Physics fail.
- Avoid mutations to the Rapier world during callbacks mid-step. Prefer flagging work for the next frame (TTL, queues, or ECS tags), then perform removals in a dedicated system.

