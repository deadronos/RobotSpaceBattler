# Active Context - RobotSpaceBattler

**Last updated:** 2025-09-20

## Current focus

- Stabilize the physics-first simulation and ensure deterministic test modes are reliable.
- Finalize unified weapons ECS integration and expand unit tests for weapon cooldowns, AOE, and edge cases.
- Continue improving observability and dev tooling (diagnostics overlay, spawn controls, deterministic test hooks).

## Recent changes (implemented)

- Seeded RNG utility added and adopted by deterministic tests.
- Rapier physics integrated; `RigidBody` is treated as authoritative; transform sync utilities exist.
- Procedural robot prefabs and spawn controls implemented (developer UI).
- Weapons subsystems (Hitscan, Projectile, Beam) implemented and emitting events; projectiles and beams spawn with Rapier bodies.
- Event-driven FX system added (`src/systems/FxSystem.ts` + `FXLayer`) with `showFx` toggle.
- Damage, Respawn, and Scoring systems implemented with corresponding UI and tests.
- Playwright smoke E2E added to verify basic UI and canvas rendering in CI.

## Next steps

- Integrate weapons ECS fully into `Simulation.tsx` and remove any legacy wiring.
- Harden friendly-fire and `sourceId` propagation across weapon → projectile flows and add regression tests.
- Add optional GLTF loader and model replacement path for procedural prefabs.

## Decisions & conventions

- Rapier `RigidBody` remains authoritative for transforms; systems must not mutate mesh transforms directly when physics are present.
- Small, testable systems should be preferred over large monolithic per-frame files.

## Notes / verification

- Playwright config uses a webServer that starts Vite on port 5174 for CI; local `npm run dev` uses Vite's default 5173.
- Maintain `utils/seededRng.ts` as the canonical seeded RNG helper for deterministic tests.
