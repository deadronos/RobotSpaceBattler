# Pathing & Line-of-Sight Contract

Purpose: Define how pathfinding and line-of-sight (LOS) checks must account for dynamic obstacles and the tests that will validate AI behaviour.

## Line-of-Sight (LOS)

- Requirements:
  - `isLineOfSightBlocked` must return `true` for segments intersecting either static geometry or runtime obstacles when the runtime aware check is enabled.
  - The runtime-aware LOS check must be available in two forms: lightweight in-memory checks (for unit tests) and Rapier raycast checks (when Rapier world is present).

## Pathfinding & AI

- Requirements:
  - AI pathfinding must detect the change in obstruction and re-run route planning within a bounded time (e.g., within `3` ticks) after a previously-valid path becomes blocked.
  - If no valid path exists after re-evaluation, AI must fall back to a defined behaviour (wait/patrol/retreat) rather than become stuck.

## Acceptance Tests (examples)

1. LOS runtime check — moving barrier
   - Place a moving barrier that crosses the direct line between two points exactly at tick T.
   - Assert: `isLineOfSightBlocked` is `false` at T-1, `true` at T when barrier is in the segment, `false` at T+N when barrier leaves.

2. AI re-route
   - Setup: AI unit has a planned route A -> B with no obstacle. Insert a moving barrier so the route is blocked after start.
   - Assert: AI recomputes route within `<= 3` ticks and either reaches target by an alternate route or decides path unreachable and executes fallback.
