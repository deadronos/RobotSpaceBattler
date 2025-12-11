# System Patterns

**Created:** 2025-10-17

Canonical system patterns used across the repo:

- Physics-authoritative pattern

  - RigidBodies own transforms; `physicsSyncSystem` copies translation into `entity.position`.

- Deterministic Fixed-Step Driver

  - `FixedStepDriver` with seeded RNG is the single source of simulation timing and randomness.

- Pure, testable systems

  - Systems accept explicit inputs (world, rng, rapierWorld, simNowMs). Decision logic lives in pure functions.

- Event queue pattern

  - Systems push events (WeaponFiredEvent, DamageEvent) to arrays consumed by downstream systems in the same step.

- Prefab wiring

  - React prefabs attach `rigid` refs and initial component data; cleanup removes `rigid` on unmount.

Physics Scale & Collider Design (2025-12-10)

- **World Unit Scale**: 1 Rapier unit = 1 meter (1:1 scale)
- **Collider Philosophy**: All colliders sized at 99% of visual mesh dimensions for ~1cm clearance
- **Robot Constants**: `ROBOT_RADIUS = 0.891m`, `AVOIDANCE_RADIUS = 1.2m`
- **Collider Types**: Explicit colliders (CapsuleCollider, CylinderCollider, CuboidCollider) at 99% scale
- **Navigation**: AI steering begins at 1.2m, collision at ~1cm clearance

Edge cases and recommended practices

- Always check `rigid` API availability before calling Rapier methods (defensive try/catch in systems used in tests).
- Use small epsilon when comparing positions in `physicsSyncSystem` to avoid jitter-driven updates.
- Collider dimensions must match visual geometry at 99% scale for accurate collision feedback.
