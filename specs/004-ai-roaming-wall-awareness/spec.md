AI: Roaming & Wall-Awareness

Status: Proposed / Implemented (codex/improve-robot-awareness-of-walls-and-colliders)

## Summary

This document describes the recent additions to the robot AI that prevent robots piling up at walls and add a simple roaming/scouting behaviour when robots lose recent line-of-sight (LOS) to enemies.

The implementation goals were:
- Make robots aware of static arena geometry (walls and pillars) and apply a local avoidance force so they slide away instead of pushing into obstacles.
- Make robots passive when they no longer have recent LOS to enemies (a short timeout) to avoid aggressive, long-lived pursuit into corners.
- Add a simple roaming behaviour: select a nearby random waypoint and move there while passive; break roaming immediately if enemies are seen.

## Files changed

- `src/simulation/ai/pathing.ts`
  - Adds wall and pillar avoidance in `planRobotMovement` using the arena geometry (`ARENA_WALLS`, `ARENA_PILLARS`, `ROBOT_RADIUS`).
  - Constants: `AVOIDANCE_RADIUS`, `AVOIDANCE_STRENGTH` control the local avoidance behaviour.

- `src/ecs/systems/aiSystem.ts`
  - Adds an engage-memory timeout (`ENGAGE_MEMORY_TIMEOUT_MS = 1500`) so that robots only pursue enemy memory younger than the timeout.
  - Adds lightweight roaming: when memory is stale, pick a random roam point inside `ARENA_BOUNDS` (with a margin) and set `robot.ai.searchPosition` to that roam point. `robot.ai.roamTarget` and `robot.ai.roamUntil` store roam state.

- `src/ecs/world.ts`
  - Adds `roamTarget?: Vec3 | null` and `roamUntil?: number | null` to the `RobotAIState` type to persist roaming choices across ticks.

- `tests/ai/aiSystem.spec.ts`
  - New test verifying LOS timeout causes robots to stop pursuing and to pick a roam target.

- `tests/ai/pathing.spec.ts`
  - Added test verifying an avoidance velocity when a robot is adjacent to a wall.

## Behaviour design

1. Line-of-sight and memory:
   - Sensors maintain an enemy memory for a longer duration (8s) to support tracking and scoring. However, for active pursuit we only respect memory younger than `ENGAGE_MEMORY_TIMEOUT_MS` (1.5s) to avoid chasing stale targets into obstacles.
   - If no recent memory exists, the AI clears `targetId` and `searchPosition` and enters roaming.

2. Roaming / scouting:
   - Roaming is a simple random waypoint selection inside the arena bounds with a margin to avoid hugging walls.
   - `roamUntil` sets how long the roam target should be kept (3–7s random in the current implementation).
   - If an enemy is seen (visible via sensors), roaming is cancelled immediately and engagement logic proceeds.

3. Wall/pillar avoidance:
   - `planRobotMovement` computes a local avoidance vector by sampling distance to each wall AABB and pillar circle (2D). When the robot is within `AVOIDANCE_RADIUS`, it receives a repulsive vector away from the geometry scaled by `(AVOIDANCE_RADIUS - dist) / AVOIDANCE_RADIUS`.
   - The avoidance vector is blended into the desired velocity before clamping and neighbor separation so robot steering respects both formation and obstacle avoidance.

## Parameters (defaults)

- `ENGAGE_MEMORY_TIMEOUT_MS = 1500` — how long after losing sight the robot will consider pursuing remembered positions.
- `AVOIDANCE_RADIUS = 3.0` — distance (units) within which walls/pillars influence robot steering.
- `AVOIDANCE_STRENGTH = 1.2` — multiplier on avoidance contribution when blended with desired velocity.
- `Roam margin = 6` — distance from arena bounds to keep roam waypoints inside playable area.
- `Roam duration = 3000–7000 ms` — how long a roam target is kept before refreshing.

These constants live near the top of the modified source files and can be tuned without structural changes.

## Tests

- `tests/ai/aiSystem.spec.ts` validates that when an enemy moves out of sensor range and >1.5s elapses, the robot clears `targetId` and selects a `roamTarget`.
- `tests/ai/pathing.spec.ts` includes a case where a robot is placed adjacent to the outer wall and expects a non-zero velocity away from the wall.

Run tests with:

```bash
npm run test
```

## Observations & tuning guidance

- If robots still wedge in narrow corridors, consider:
  - Increasing `AVOIDANCE_RADIUS` and/or `AVOIDANCE_STRENGTH`.
  - Adding a short-term velocity damping when near walls to avoid oscillation.
  - Using short raycasts (or Rapier overlap queries) against physics colliders for higher-fidelity avoidance.

- For roaming refinement:
  - Replace random waypoint selection with a coverage map to prefer unexplored areas.
  - Bias roaming points away from team anchors or spawn centers to improve map control.

## Next steps

1. Visual playtesting: run the game and observe robot behavior in busy scenarios. Adjust constants accordingly.
2. Add additional unit tests for roam expiry behaviour and more challenging corridor scenarios.
3. Optionally integrate Rapier overlap queries for more physically accurate local avoidance.

## Change log

- Implemented in branch: `codex/improve-robot-awareness-of-walls-and-colliders`
- PR: (if created) reference will include this spec and test additions.

---
Spec authored: 2025-11-07
