# Spawn Contract: Robot Team Initialization (As Implemented)

- **Feature**: 001-3d-team-vs
- **Validates**: FR-001 (Robot spawning)
- **Date**: 2025-10-06

This contract documents the current spawning behavior.

## Spawn Rules

1. **Team Size**: Each match spawns exactly 10 robots per team (20 total).
2. **Spawn Points**: Spawn points are taken from `TEAM_CONFIGS[team].spawnPoints.slice(0, 10)`.
3. **Initial Health**: All robots spawn with `health = maxHealth = 100`.
4. **Weapon Distribution**: Weapons are assigned by spawn index rotation:
   - `weapon = ["laser", "gun", "rocket"][spawnIndex % 3]`.
   - This yields a deterministic per-team distribution of 4/3/3 across the 10 spawns.
5. **Captain Election**: After spawning a team, captaincy is applied using the captain election contract.

## Notes on Determinism

`TEAM_CONFIGS` currently uses `Math.random()` to add jitter when generating spawn centers and spawn grids.
This means exact spawn coordinates can vary across page reloads, but once the app is running the spawn
points are stable within that session.

## References

- Team config and spawn points: `src/lib/teamConfig.ts`
- Spawning logic: `src/ecs/systems/spawnSystem.ts`
- Tests: `tests/spawn-system.spec.ts`

