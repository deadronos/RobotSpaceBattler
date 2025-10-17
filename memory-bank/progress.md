# Progress

**Created:** 2025-10-17

What works

- Simulation loop and core systems implemented (AI, Weapon, Projectile, Beam, Damage, Respawn)
- Physics sync and prefab wiring with Rapier implemented
- Unit tests for many pure functions exist under `tests/`

What's left / known issues

- Friendly-fire edge cases and AoE attribution need additional tests
- Performance tuning for WebGL / FX on lower-end devices
- Expand documentation for contributors (how to run tests and debug determinism)

Milestones

- Deterministic simulation + test harness — complete
- Playwright E2E coverage of boot and core flows — partial
