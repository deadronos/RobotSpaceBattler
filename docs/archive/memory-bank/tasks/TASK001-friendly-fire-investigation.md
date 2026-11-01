# TASK001 - AoE team-filter and attribution regression tests

**Status:** Pending  
**Added:** 2025-10-17  
**Updated:** 2025-12-19

## Original Request
Investigate friendly-fire handling and AoE attribution edge cases and add tasks/tests to lock down desired behavior.

## Updated Scope (2025-12-19)
The current implementation does not expose a friendly-fire toggle. Projectiles are
team-filtered in the projectile simulation: direct hits and rocket explosions skip
same-team robots.

This task is now focused on adding regression tests that lock down that behavior
and verify kill/telemetry attribution.

## Thought Process

- Direct hits should only apply damage when `target.team !== projectile.team`.
- Rocket AoE should not damage robots on the same team as the projectile.
- Telemetry should record `attackerId` and `teamId` consistently for both direct
  hits and AoE damage.
- Kill attribution should increment the shooter kill count when the shooter entity is available.

## Implementation Plan

- Add Vitest unit tests for `updateProjectileSystem`:
  - Direct-hit team filtering (same-team target takes no damage).
  - Rocket AoE team filtering (same-team robots inside radius take no damage).
  - Telemetry attribution sanity checks (damage/death events reference the shooter/team).

- If unit tests are too coupled to ECS internals, add a small helper/fixture to
  build a minimal `BattleWorld` with a few robots and one projectile.

## Progress Tracking
**Overall Status:** Not Started - 10%

### Subtasks

| ID  | Description                         | Status      | Updated    | Notes                   |
| --- | ----------------------------------- | ----------- | ---------- | ----------------------- |
| 1.1 | Confirm projectile team filtering   | Complete    | 2025-12-19 | Direct hit + rocket AoE |
| 1.2 | Test: direct hit ignores same-team  | Not Started |            |                         |
| 1.3 | Test: rocket AoE ignores same-team  | Not Started |            |                         |
| 1.4 | Test: telemetry/kill attribution    | Not Started |            |                         |

## Progress Log
### 2025-12-19

- Rescoped task: no friendly-fire toggle exists; behavior is hard-coded team filtering.
- Identified regression-test targets: direct hit, rocket AoE, telemetry/kill attribution.


### 2025-10-17

- Created task and initial plan.
