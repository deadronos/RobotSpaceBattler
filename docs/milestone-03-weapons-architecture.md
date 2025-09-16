# Milestone 03 — Weapons System Architecture

1. Goal
   - Create a unified, data-driven weapons architecture covering hitscan, projectile, beam, and AOE behaviors.

2. Deliverables
   - Weapons registry and interface (`src/ecs/weapons.ts`)
   - Unification of hitscan/projectile lifecycles
   - Support for charge, overheat, and alt-fire modes
   - Balance table (JSON/YAML) for tuning

3. Tasks
   - Audit existing weapon systems (BeamSystem, ProjectileSystem, HitscanSystem, WeaponSystem).
   - Design a single `Weapon` lifecycle with hooks for spawn, update, collide, expire.
   - Implement registry and migration adapters for legacy weapons.
   - Add tests for deterministic firing, cooldown, and overheat.

4. Timeline
   - 2-3 sprints to refactor and stabilize.

5. Risks
   - Breaking existing tests/behaviors.
   - Edge cases for combined modes (beam + projectile).

6. Acceptance Criteria
   - Existing weapon tests pass or are updated with clear migration notes.
   - New features (alt-fire, overheat) have unit tests and example configs.
