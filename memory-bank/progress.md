# Progress - RobotSpaceBattler

**Last updated:** 2025-10-03

## What works (completed / available)

- Core simulation and renderer (react-three-fiber) with on-demand rendering.
- Procedural robot generation and basic AI; bots are spawned by `resetAndSpawnDefaultTeams()` before React mounts so the first render sees entities.
- Rapier physics with transform-sync utilities (`physicsSyncSystem`).
- Weapons subsystems (Hitscan, Projectile, Beam) fully integrated into the fixed-step Simulation loop and covered by unit tests.
- Damage, Respawn, and Scoring systems with UI and tests.
- Event-driven FX system and `FXLayer` rendering; FX is toggleable via UI.
- Deterministic fixed-step loop (`useFixedStepLoop`) provides a seeded RNG per tick and consistent timestep (default 1/60). Tests use the driver to reproduce deterministic behavior.
- Playwright smoke E2E and Vitest unit test coverage for core systems.

## Remaining work

- Harden friendly-fire rules and ensure `sourceId` is reliably propagated from weapon → projectile → damage (regression tests required).
- Add optional GLTF loader and model replacement path for robot prefabs; keep procedural prefabs as canonical defaults.
- Expand unit tests around fixed-step edge cases, FX emission order, and network-friendly serialization (if/when networking is added).

## Current status

- Weapons ECS: integrated and running in Simulation's fixed-step loop.
- Tests: unit tests present and CI smoke test configured; expand coverage on edge cases and timing-sensitive behaviors.
- CI: Playwright smoke configured to use `webServer` (port 5174) for CI runs.

## Known issues / notes

- Friendly-fire/sourceId propagation needs regression tests to avoid accidental friendly-fire.
- Ensure deterministic tests use the fixed-step driver so RNG and timing are reproducible.
- Consider adding a small `memory/` designs folder for spec-driven artifacts (per Spec-Driven Workflow guidance) if design artifacts accumulate.
