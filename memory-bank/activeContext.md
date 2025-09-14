# Active Context — RobotSpaceBattler

## Current focus

- Stabilize simulation authority between Rapier RigidBody and the ECS.
- Improve test coverage for core systems (spawning, physics sync, projectile lifecycle).

## Recent changes

- Added memory-bank scaffolding and developer guidance.
- Small refactors to `src/components/Simulation.tsx` to make systems easier to test (see commit history).

## Next steps

- Add a deterministic RNG helper for seeded simulation tests.
- Increase unit tests for `physicsSync` and AI tick systems.
- Add more tasks to `memory-bank-/tasks/_index.md` as work items are discovered.

## Decisions

- Rapier's RigidBody is authoritative for transforms; ECS components should read from Rapier each frame.
