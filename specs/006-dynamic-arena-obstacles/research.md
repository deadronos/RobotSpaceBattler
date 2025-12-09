# Research Notes — Dynamic Arena Obstacles (Phase 0)

Generated: 2025-12-10

## Goal

Confirm the practical integration points and constraints for adding dynamic obstacles (moving barriers, hazard zones, destructible cover) into the existing simulation with deterministic, testable behaviour.

## Findings

- Rapier physics is already present and used in tests (rapier3d-compat). The runtime exposes a Rapier world reference through `BattleRunner`/`BattleWorld` APIs — this enables physics-aware queries and raycasts.
- `isLineOfSightBlocked` current implementation in `src/simulation/environment/arenaGeometry.ts` only accounts for static arrays (`ARENA_WALLS`, `ARENA_PILLARS`). Several AI systems (sensors, avoidance) call this — they will need a path to query dynamic runtime geometry.
- The existing test harness can create a mock Rapier world for tests (`tests/runtime/*`), making Rapier-based unit/integration tests feasible.

## Proposed Approach

1. Keep static geometry checks in `arenaGeometry.ts` as-is; add an optional runtime-aware path that checks dynamic obstacle state via either:
   - Rapier raycasts against obstacle colliders (preferred when world is available), or
   - In-memory dynamic obstacle registry (fast-path for unit tests without a rapier world).

2. Implement movement as deterministic pattern-driven updates (MovementPattern component) that mutate transform/kinematic colliders each tick. Record state changes to MatchTrace / telemetry to support deterministic replays and CI verification.

3. Hazard zones will be time-driven with explicit schedules (period/duty/offset) so tests can step the schedule in deterministic time steps.

4. Destructible cover will be an obstacle with a durability value; damage events will decrement durability; once durability <= 0 the obstacle will be removed. For this spec the cover will be permanently removed for the match.

5. Collision behavior: moving obstacles will act as strict blockers (no pushing). Kinematic colliders are acceptable if rapier is used — keep movement authoritative in the simulation system.

## Unknowns & Risks

- Multiplayer / replication is out-of-scope for now (FR-008 resolved to local-only). If replicated later, obstacle state must be reconciled and validated for deterministic behavior.
- Performance: 50 active dynamic obstacles is the initial stress target. Instruments will be needed for profiling and budget tuning.

## Next steps (Phase 1)

- Finalize concrete component shapes (`data-model.md`).
- Create clear acceptance contracts for deterministic tests and pathing integration (`contracts/*`).
