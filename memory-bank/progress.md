
# Progress - RobotSpaceBattler

## What works (completed/available)

- Core simulation loop and renderer (Three.js + react-three-fiber)
- Procedural robot generation and basic AI
- Rapier physics integration with transform sync utilities
- Weapons systems: Hitscan, Projectile and Beam systems are implemented and wired to spawn physics-backed entities
- DamageSystem implemented and emits death events
- Seeded RNG utility and deterministic unit tests
- Unit tests for core systems (Vitest) including projectile lifecycle and physics sync
- Playwright E2E smoke test added and verified locally (`playwright/tests/smoke.spec.ts`) asserting `#status` and `canvas` presence
- Dev diagnostics and spawn/reset controls for robot teams exposed in the UI
- Respawn and scoring loop implemented (systems + UI + tests).
## What's left to build / improve

- Integrate unified weapons ECS fully into `Simulation` (final wiring and cleanup)
- Harden friendly-fire rules and ensure `sourceId` is propagated from weapon -> projectile (see TASK007/TASK008)
- Add GLTF asset loader and optional replacement of procedural prefabs
- Increase unit test coverage for weapon cooldowns, AOE, and edge-case behaviors

## Current status

- Weapons ECS: Nearing completion — core subsystems implemented, final integration pending (see TASK006)
- Playwright smoke: Present and verified locally using repository Playwright config (CI will run this via its configured webServer that starts the dev server on port 5174)
- Task list expansion: Ongoing (see TASK005)

## Known issues / notes

- Playwright's config starts a dev server on port 5174 for CI; Vite's dev server default remains 5173 for local dev. This is documented in `memory-bank/techContext.md` and the handover recommends ensuring CI/Playwright runs use the configured webServer behavior.
- Some systems still require expanded unit tests before closing out their tasks.



