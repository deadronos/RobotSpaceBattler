# Progress - RobotSpaceBattler

**Last updated:** 2025-09-20

## What works (completed / available)

- Core simulation and renderer (react-three-fiber)
- Procedural robot generation and basic AI
- Rapier physics with transform-sync utilities
- Weapons subsystems (Hitscan, Projectile, Beam) with tests
- Damage, Respawn, and Scoring systems with UI and tests
- Event-driven FX system and `FXLayer` rendering
- Seeded RNG utility used for deterministic tests
- Playwright smoke E2E and Vitest unit test coverage for core systems

## Remaining work

- Finalize unified weapons ECS integration and cleanup
- Harden friendly-fire rules and ensure `sourceId` is reliably propagated
- Add optional GLTF loader and model replacement path
- Expand unit test coverage for cooldowns, AOE, and edge cases

## Current status

- Weapons ECS: near-complete; final integration pending.
- Tests: unit tests present; expand coverage on edge cases.
- CI: Playwright smoke configured to use `webServer` (port 5174) for CI runs.

## Known issues / notes

- Ensure Playwright's `webServer` configuration is used in CI to start Vite on port 5174.
- Keep `utils/seededRng.ts` authoritative for deterministic test behavior.
