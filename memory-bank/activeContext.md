# Active Context - RobotSpaceBattler

## Current focus

- Build a unified weapons ECS (guns, lasers, rockets) on top of miniplex.
- Maintain deterministic simulation utilities.

## Recent changes

- Added seeded RNG helper and tests.
- Drafted weapons ECS design doc and system skeletons.
- Projectiles and beams now spawn as physics-backed render entities.
- Weapon aiming now respects tracked targets and emits target ids through events.
- miniplex store assigns numeric entity ids for weapon lookups.

## Next steps

- Integrate weapon systems into Simulation.
- Harden target acquisition/friendly-fire rules and edge cases.
- Expand unit tests for cooldowns and projectile lifecycle.
- Add more tasks to `memory-bank-/tasks/_index.md` as work items are discovered.

## Decisions

- Rapier's RigidBody is authoritative for transforms; ECS components should read from Rapier each frame.

