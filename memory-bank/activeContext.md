# Active Context - RobotSpaceBattler

**Last updated:** 2025-10-05

## Current focus

- Maintain and validate the deterministic fixed-step simulation (`useFixedStepLoop`) and ensure tests reflect real-world timing and RNG behavior.
- Continue hardening weapon behaviors around friendly-fire and reliable `sourceId` propagation between weapon → projectile → damage flows.
- Small refactors to keep per-frame systems compact and testable (AI, weapons, physics-sync, FX).
- Maintain test instrumentation surfaces: `useFixedStepLoop` offers `testMode` and an
  instrumentation hook. `Simulation` exposes test-only helpers
  (`__testSetSimulationInstrumentationHook`, `__testGetFixedStepHandle`) and uses
  `RngProvider`/`TimeProviderComponent` when running in `testMode` so unit tests
  can inject deterministic providers.

## Recent changes (implemented)

- Deterministic fixed-step loop added and used by `Simulation` via
  `useFixedStepLoop`; the driver supplies a seeded RNG per tick and the fixed
  timestep used everywhere (default 60Hz). The driver also accepts runtime
  flags (for example `friendlyFire`) and exposes test helpers such as
  `getMetrics()` in test mode.
- Weapons stack integrated into the Simulation loop: `weaponSystem`,
  `hitscanSystem`, `beamSystem`, and `projectileSystem` are invoked each fixed
  step. The WeaponSystem uses an object-param API that accepts the current
  StepContext to ensure deterministic resolution.
- AI decisions centralized in `aiSystem` (moved out of render helpers) and receive RNG, Rapier context, and simulation time.
- Rapier physics integrated; `RigidBody` is treated as authoritative; `physicsSyncSystem` reconciles ECS state with physics.
- FX system implemented (`fxSystem` + `FXLayer`) and toggled via `useUI().showFx`.
- Initial world population: `main.tsx` calls `resetAndSpawnDefaultTeams()` before React mounts so the first render sees entities.
- Simulation bootstrap and spawn logic extracted to `useSimulationBootstrap` to
  centralize initial population and provide test-friendly hooks.
- A runtime event log is created inside `Simulation` (`createRuntimeEventLog`) and
  exposed to the runtime (`setRuntimeEventLog`) for diagnostics and scoring audit
  entries.
- Pause/resume velocity capture and restore utilities (`capturePauseVel` /
  `restorePauseVel`) are used by `Simulation` to preserve motion across pauses.

## Next steps

- Harden friendly-fire and `sourceId` propagation across weapon → projectile flows and add regression tests to prevent regressions.
- Add an optional GLTF loader/model replacement path for robot prefabs; keep procedural prefabs as canonical defaults.
- Audit and expand unit tests to cover fixed-step timing edge cases, FX emission order, and instrumentation hooks.

## Decisions & conventions

- Rapier `RigidBody` remains authoritative for transforms; systems must not
  mutate mesh transforms directly when physics bodies are present.
- Deterministic simulation is provided by `useFixedStepLoop`; tests that depend
  on RNG or timing should use the driver or its test helpers to reproduce
  behavior.
- Keep systems small and export pure functions where possible to enable unit testing without Three.js or Rapier.
