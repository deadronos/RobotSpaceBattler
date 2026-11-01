# Obstacle Behaviour Contract

Purpose: Define observable behaviours and deterministic acceptance tests for each obstacle type.

## Moving Barrier — Acceptance

- Behaviour: follows a deterministic `MovementPattern` and toggles blocking state only by location.  
- Acceptance tests:
  - Unit: `movementSystem` deterministic step tests — after N ticks the barrier has moved to expected position within tolerance (±0.01 units).
  - Integration: Place barrier between points A and B such that it blocks LOS for 1200ms. Verify `isLineOfSightBlocked` reports blocked during that window and unblocked when barrier moves away.

## Hazard Zone — Acceptance

- Behaviour: Activates/deactivates on a deterministic schedule and applies effects while active.
- Acceptance tests:
  - Unit: Validate schedule logic — stepping the simulation results in active windows at predictable ticks.
  - Integration: Place a unit inside the hazard; step several cycles and assert damage/healing or slow effect is applied only during active windows and stops when inactive.

## Destructible Cover — Acceptance

- Behaviour: Blocks vision and traversal until durability reaches zero, then removed for the remainder of match.
- Acceptance tests:
  - Unit: Damage event reduces durability as expected and triggers a `cover:destroyed` event when durability <= 0.
  - Integration: Confirm that after destruction, `isLineOfSightBlocked` and pathfinding treat the location as open.

## Determinism Requirements

- All tests must be deterministic in headless CI: movement patterns must be seeded or defined so the same step count yields consistent state. Telemetry/MatchTrace entries must include `frameIndex` and `timestampMs` to assert ordering.
