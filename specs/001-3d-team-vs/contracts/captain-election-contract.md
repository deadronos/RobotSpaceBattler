# Captain Election Contract

**ID**: FR-002-CAP-001  
**Feature**: 001-3d-team-vs

## Purpose

This contract records the captain-election algorithm used by the current implementation.

## Data Model Notes

- The repository does **not** maintain a separate Team entity with `captainId`.
- Captaincy is represented by a boolean flag on `RobotEntity` (`robot.isCaptain`).
- Kill count is stored directly as `robot.kills`.

## Preconditions

- A list of robot entities exists.
- Each robot has: `id`, `team`, numeric `health`, numeric `kills`, and a `position`.
- The team spawn center is known (used for the distance tie-breaker).

## Election Algorithm (authoritative)

When electing a captain (at spawn, or when re-election is required):

1. Consider only robots on the target team with `health > 0`.
2. Select the robot(s) with the highest `health` value.
3. If multiple robots remain, select the robot(s) with the highest `kills`.
4. If still tied, select the robot(s) with the smallest distance to the team spawn center.
5. If still tied, select the robot with the lexicographically smallest `id`.
6. Set `robot.isCaptain = true` only for the selected robot, and `false` for other robots on that team.

## Re-election Rules

- Re-election MUST occur immediately when the current captain is eliminated.
- If no active robots remain, then no robot on that team should have `isCaptain = true`.

## Determinism

- Given the same set of eligible robots and identical inputs, the selection MUST always produce the
  same captain `id`.

## Acceptance Criteria

- Highest-health robot becomes captain.
- When health ties, robot with more kills wins.
- When health and kills tie, closest-to-spawn wins.
- When health, kills, and distance tie, lexicographically smallest `id` wins.
- Updating captaincy updates `isCaptain` flags in-place and produces at most one captain.

## References

- Tests: `tests/captain-election.spec.ts`
- Implementation: `src/lib/captainElection.ts`
- Applied at spawn: `src/ecs/systems/spawnSystem.ts`
- Re-applied on death: `src/ecs/systems/projectileSystem.ts`
