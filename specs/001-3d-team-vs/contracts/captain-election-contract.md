# Captain Election Contract

ID: FR-002-CAP-001

Purpose
--------
This contract records the captain-election algorithm used by the current implementation.

Notes
-----
- The repository does **not** maintain a separate Team entity with `captainId`.
- Captaincy is represented by a boolean flag on `RobotEntity` (`robot.isCaptain`).
- Kill count is stored directly as `robot.kills`.

Contract: Preconditions
-----------------------
- A list of robot entities exists.
- Each robot has: `id`, `team`, numeric `health`, numeric `kills`, and a position.
- The team spawn center is known (used for distance tie-breaker).

Selection Algorithm (authoritative)
----------------------------------
When electing a captain (at spawn, or when re-election is required):

1. Consider only robots on the target team with `health > 0`.
2. Select the robot(s) with the highest `health` value.
3. If multiple robots remain, select the robot(s) with the highest `kills`.
4. If still tied, select the robot(s) with the smallest distance to the team spawn center.
5. If still tied, select the robot with the lexicographically smallest `id`.
6. Set `robot.isCaptain = true` only for the selected robot, and `false` for other robots on that team.

Re-election rules
-----------------
- Re-election MUST occur immediately when the current captain is eliminated.
- If no active robots remain, then no robot on that team should have `isCaptain = true`.

Determinism
-----------
- Given the same set of eligible robots and identical inputs, the selection MUST always produce the
  same captain `id`.

Acceptance Criteria
-------------------
- Highest-health robot becomes captain.
- When health ties, robot with more kills wins.
- When health and kills tie, closest-to-spawn wins.
- When health, kills, and distance tie, lexicographically smallest `id` wins.
- Updating captaincy updates `isCaptain` flags in-place and produces at most one captain.

References
----------
- Tests: `tests/captain-election.spec.ts`
- Implementation: `src/lib/captainElection.ts`
- Applied at spawn: `src/ecs/systems/spawnSystem.ts`
- Re-applied on death: `src/ecs/systems/projectileSystem.ts`
# Captain Election Contract

ID: FR-002-CAP-001

Purpose
--------
This contract records the authoritative captain-election algorithm and acceptance criteria used for
Test-Driven Development (TDD) and implementation of the spawn and captain-AI systems.

Rationale
---------
A deterministic, well-documented election algorithm ensures reproducible simulation runs and allows
contract tests to reliably assert captain assignment and re-assignment behavior across CI runs.

Contract: Preconditions
-----------------------
- A Team entity exists with `activeRobots > 0` and a list of active Robot entities.
- Each Robot has: `id`, `team`, numeric `health`, `stats.kills`, and a position (`Vector3`).
- The team spawn center is known (used for distance tie-breaker).

Selection Algorithm (authoritative)
----------------------------------
When electing a captain (at spawn, or when re-election is required):

1. Consider only robots with `health > 0` (active robots).
2. Select the robot(s) with the highest `health` value.
3. If multiple robots remain, select the robot(s) with the highest `stats.kills`.
4. If still tied, select the robot(s) with the smallest Euclidean distance to the team's spawn center.
5. If still tied, select the robot with the lexicographically smallest `id`.
6. Mark the selected robot's `isCaptain = true` and set Team.captainId to that robot's `id`.

Re-election rules
-----------------
- Re-election MUST occur immediately when the current captain is eliminated.
- Re-election MUST also be possible on-demand (explicit API/signal) to support tests and deterministic
  state manipulations.
- If `activeRobots === 0` the Team.captainId MUST be set to `null`.

Determinism & Atomicity
-----------------------
- Given the same set of active robots and identical inputs, the selection MUST always produce the
  same captain `id` (deterministic). This is required for reproducible tests.
- The election operation MUST behave atomically with regard to captain state: the team should never
  observe more than one captain at a time.

Acceptance Criteria (TDD)
-------------------------
- Contract tests assert the following scenarios and pass:
  - Highest-health robot becomes captain.
  - When health ties, robot with more `stats.kills` wins.
  - When health and kills tie, closest-to-spawn wins.
  - When health, kills, and distance tie, lexicographically smallest `id` wins.
  - When a captain dies, the team immediately gets a new captain (or `captainId = null` when none remain).
- Tests must be deterministic and reproducible in CI.

Suggested test helper API (used by contract tests)
--------------------------------------------------
These helpers are used by contract tests to manipulate state deterministically:
- `initializeSimulation(): World` — creates test world and returns initial entities.
- `setRobotHealth(world, robotId, health)` — set a robot's health and update relevant systems.
- `setRobotKills(world, robotId, kills)` — set a robot's kills stat.
- `setRobotPosition(world, robotId, position: Vector3)` — set robot position for distance tie-breakers.
- `triggerCaptainReelection(world, team)` — explicitly triggers re-election (useful in tests).
- `calculateDistance(a: Vector3, b: Vector3): number` — utility used in tests to assert distances.

References
----------
- Tests: `tests/contracts/captain-election.test.ts`
- Implementation: `src/ecs/systems/spawnSystem.ts`, `src/ecs/systems/ai/captainAI.ts`, `src/ecs/entities/Team.ts`

Notes
-----
- When adding new tie-breakers or changing ordering, update this contract and any contract tests first.
- Keep this file short and authoritative: contract tests and the spawn/captain implementations should
  refer to this document as the single source of truth.
