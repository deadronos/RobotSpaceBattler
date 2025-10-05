# Progress - RobotSpaceBattler

**Last updated:** 2025-10-05

## What works (completed / available)

- Core simulation and renderer (react-three-fiber) with on-demand rendering.
- Procedural robot generation and basic AI; bots are spawned by `resetAndSpawnDefaultTeams()` before React mounts so the first render sees entities.
- Rapier physics with transform-sync utilities (`physicsSyncSystem`).
- Weapons subsystems (Hitscan, Projectile, Beam) fully integrated into the fixed-step Simulation loop and covered by unit tests.
- Damage, Respawn, and Scoring systems with UI and tests.
- Event-driven FX system and `FXLayer` rendering; FX is toggleable via `useUI().showFx`.
- Deterministic fixed-step loop (`useFixedStepLoop`) provides a seeded RNG per
  tick and consistent timestep (default 1/60). Tests use the driver to reproduce
  deterministic behavior. The driver also accepts runtime flags (for example
  `friendlyFire`) and exposes metrics and test-only instrumentation when
  `testMode` is enabled.
- Simulation now creates a runtime event log (`createRuntimeEventLog`) exposed
  via `setRuntimeEventLog` for diagnostics and scoring audit traces.
- Simulation bootstrap logic extracted into `useSimulationBootstrap` and spawn
  controls are centralized in `src/robots/spawnControls`.

## Remaining work

- Harden friendly-fire rules and ensure `sourceId` is reliably propagated from
  weapon → projectile → damage (regression tests required).
- Add optional GLTF loader and model replacement path for robot prefabs; keep procedural prefabs as canonical defaults.
- Expand unit tests around fixed-step edge cases, FX emission order, and instrumentation hook coverage.

## Current status

- Weapons ECS: integrated and running in Simulation's fixed-step loop.
- Tests: unit tests present and CI smoke test configured; expand coverage on edge cases and timing-sensitive behaviors.
- CI: Playwright smoke configured to use `webServer` (port 5174) for CI runs.

## Known issues / notes

- Friendly-fire/sourceId propagation needs regression tests to avoid accidental friendly-fire.
- Ensure deterministic tests use the fixed-step driver so RNG and timing are reproducible.
