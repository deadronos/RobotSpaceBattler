# Active Context - RobotSpaceBattler

**Last updated:** 2025-10-03

## Current focus

- Maintain and validate the deterministic fixed-step simulation (`useFixedStepLoop`) and ensure tests reflect real-world timing and RNG behavior.
- Continue hardening weapon behaviors around friendly-fire and reliable `sourceId` propagation between weapon → projectile → damage flows.
- Small refactors to keep per-frame systems compact and testable (AI, weapons, physics-sync, FX).

## Recent changes (implemented)

- Deterministic fixed-step loop added and used by `Simulation` via `useFixedStepLoop`; the driver supplies a seeded RNG per tick and the fixed timestep used everywhere (default 60Hz).
- Weapons stack integrated into the Simulation loop: `weaponSystem`, `hitscanSystem`, `beamSystem`, and `projectileSystem` are invoked each fixed step.
- AI decisions centralized in `aiSystem` (moved out of render helpers) and receive RNG, Rapier context, and simulation time.
- Rapier physics integrated; `RigidBody` is treated as authoritative; `physicsSyncSystem` reconciles ECS state with physics.
- FX system implemented (`fxSystem` + `FXLayer`) and toggled via `useUI().showFx`.
- Initial world population: `main.tsx` ensures default teams are spawned before React mounts so first render sees entities.

## Next steps

- Harden friendly-fire and `sourceId` propagation across weapon → projectile flows and add regression tests to prevent regressions.
- Add an optional GLTF loader/model replacement path for robot prefabs; keep procedural prefabs as canonical defaults.
- Audit and expand unit tests to cover fixed-step timing edge cases and FX event emission.

## Decisions & conventions

- Rapier `RigidBody` remains authoritative for transforms; systems must not mutate mesh transforms directly when physics bodies are present.
- Deterministic simulation is provided by `useFixedStepLoop`; tests that depend on RNG or timing should use the driver or its test helpers to reproduce behavior.
- Keep systems small and export pure functions where possible to enable unit testing without Three.js or Rapier.
