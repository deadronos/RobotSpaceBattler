# Feature Specification: Dynamic Arena Obstacles

**Feature Branch**: `006-dynamic-arena-obstacles`  
**Created**: 2025-12-10  
**Status**: Implemented (runtime systems + debug editor + spawner UI)  
**Input**: The arena currently uses static walls and pillars. This feature introduces
dynamic, interactive arena elements that change positioning, sightlines and
movement over time to make positioning more strategic and less predictable.
Examples include moving barriers that slide or rotate, timed hazard zones that
periodically apply effects, and destructible cover that blocks attacks until its
durability is reduced to zero.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Player Experience (Priority: P1)

Players should encounter arenas where environmental obstacles actively change
over time, creating new tactical opportunities and risks.

**Why this priority**: This directly affects core gameplay by forcing players to
adapt positioning and tactics during a match, increasing replayability and
emergent play.

**Independent Test**: A minimal arena seeded with a single moving barrier, one
hazard zone, or one piece of destructible cover should demonstrate the full
player-facing behaviour for that feature in isolation.

**Acceptance Scenarios**:

1. **Given** a playing area with a moving barrier, **When** the barrier follows
  its pattern so that a line-of-sight or path becomes blocked, **Then** units
  should no longer be able to see or traverse the blocked area until the
  barrier moves away.
2. **Given** an inactive hazard zone, **When** the zone becomes active, **Then**
  units inside the zone receive the configured effect (damage or movement
  penalty) while the zone is active and stop receiving it when it becomes
  inactive.
3. **Given** destructible cover, **When** it receives enough damage to reach
  zero durability, **Then** it no longer blocks attacks, line-of-sight or
  traversal and is removed from obstruction/pathing calculations.

---

### User Story 2 - Designer / Level Authoring (Priority: P2)

Level designers and game designers must be able to place and configure dynamic
obstacles so arena layouts can be tuned without engineering changes.

**Why this priority**: Designer tooling enables quick iteration on gameplay,
balancing and level flow without requiring developer time.

**Independent Test**: The editor should allow creating a single obstacle with a
movement pattern or hazard schedule and verify behavior in-play without code
changes.

**Acceptance Scenarios**:

1. **Given** the designer places a moving obstacle and sets a pattern and speed,
  **When** the match starts, **Then** the obstacle follows the configured
  pattern and the designer-observed blocking behavior matches configuration.
2. **Given** a hazard zone with parameters (active interval, duration, effect
  type), **When** those parameters are changed in the editor, **Then** the
  runtime behaviour reflects the new settings immediately in test runs.

---

### User Story 3 - AI / Pathfinding & Reliability (Priority: P3)

AI-controlled units and pathfinding systems must reliably treat dynamic
obstacles as changing constraints and adapt routes and behavior accordingly.

**Why this priority**: Proper AI response prevents trivial exploits (e.g.,
hugging a wall that later becomes a hazard) and improves match fairness.

**Independent Test**: A scenario where an intended route becomes blocked by a
moving obstacle should cause AI units to discover an alternate route or
wait/retreat rather than become stuck.

**Acceptance Scenarios**:

1. **Given** an AI must navigate from A to B and a moving barrier intersects its
  planned path, **When** the barrier blocks the path, **Then** AI reroutes
  within a bounded time and either finds a valid path or determines the path is
  unreachable and reacts accordingly.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- Two obstacles converge to temporarily form an impassable gap or trap a unit in
  a small area. AI should avoid permanent deadlocks by rerouting, waiting, or
  backing off (bounded time).
- Hazard zones overlap destructible cover. Effects remain deterministic and
  testable (cover destruction still follows durability rules even when inside an
  active hazard).
- Moving obstacles create temporary unreachable regions. Movement/LOS must reflect
  current runtime geometry and systems should recover when the region becomes
  reachable again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support placing environment objects that change
  position, orientation, state or presence during simulation (moving barriers,
  hazard zones, destructible cover).
- **FR-002**: Moving obstacles MUST follow deterministic, configurable movement
  patterns (linear/oscillating path following or rotation around a pivot).
- **FR-003**: Hazard zones MUST be configurable to toggle between
  active/inactive states on a schedule and apply one or more configurable
  effects to entities inside the area while active (damage, movement penalty,
  status flags).
- **FR-004**: Destructible cover MUST block attacks, line-of-sight and traversal
  until its cumulative durability reaches zero; at that point it MUST be removed
  from obstruction rules so attacks and pathing behave as if cover is no longer
  present.
- **FR-005**: Line-of-sight checks and movement blocking used by AI/targeting
  MUST account for dynamic obstacles at runtime (based on current obstacle
  position/shape).
- **FR-006**: Designers (or developers in dev builds) MUST be able to configure
  obstacle parameters (movement speed/pattern, hazard schedule/effects,
  durability) via the in-game debug Obstacle Editor.
- **FR-007**: The system MUST expose instrumentation so each obstacle instance
  can be validated in automated tests (movement updates, hazard toggles, cover
  destruction, and telemetry ordering).

## Clarifications (resolved)

- **FR-008**: Dynamic obstacles are scoped to local/single-instance simulation
  for this feature (no multiplayer replication or authoritative server behaviour
  for dynamic obstacle state at this time).
- **FR-009**: Destructible cover is removed permanently for the duration of a
  match when its durability reaches zero (no automatic respawn within a match).
  Designers may create new cover via level spawn logic across matches in
  separate flows.
- **FR-010**: Moving obstacles act as strict blockers and do not displace or push
  units on collision. Units must path around or wait for obstacle movement;
  obstacle collisions do not change unit positions.

## Physics Scale & Collider Design Decisions (2025-12-10)

**World Unit Scale**: 1 Rapier world unit = 1 meter (1:1 scale)

**Collider Sizing Philosophy**:

- All physics colliders are sized at **99% of their visual mesh dimensions** to allow ~1cm clearance before collision
- This provides tight collision detection while maintaining visual accuracy
- Example: Robot capsule collider radius 0.891m (99% of 0.9m visual)

**Robot Physics Constants**:

- `ROBOT_RADIUS`: 0.891m (matches actual capsule collider radius)
- `AVOIDANCE_RADIUS`: 0.1m (robots begin steering away from obstacles at this distance)
- Safety margins in avoidance: 0.05m (5cm) added to obstacle bounds for steering calculations

**Collider Types**:

- **Robots**: `CapsuleCollider` (half-height: 1.089m, radius: 0.891m)
- **Pillars**: `CylinderCollider` (half-height: 1.485m, radius: 1.188m)
- **Walls**: `CuboidCollider` (99% of mesh dimensions)

**Navigation Behavior**:

- Collision resolution occurs at ~1cm from visual geometry
- AI steering begins at 0.1m from obstacles (down from previous 4.5m)
- Allows robots to navigate within ~10-20cm of walls before collision

**References**: See specs 001-005 for related physics and navigation implementation details.

### Implementation Notes (current code)

- Movement patterns are implemented in `src/simulation/obstacles/movementSystem.ts`.
- Hazard schedules/effects are implemented in `src/simulation/obstacles/hazardSystem.ts`.
- Destructible cover durability/removal is implemented in
  `src/simulation/obstacles/destructibleSystem.ts`.
- The debug Obstacle Editor UI lives in `src/components/debug/ObstacleEditor.tsx`.
- A quick Obstacle Spawner is available at `src/components/debug/ObstacleSpawner.tsx` for ad-hoc placement and testing.
- Telemetry is recorded via `src/runtime/simulation/telemetryAdapter.ts` into
  `src/state/telemetryStore.ts`.

### Key Entities *(include if feature involves data)*

- **Dynamic Obstacle (conceptual)**: Represents any environment object whose
  position, rotation or state can change over time and that can affect vision,
  traversal or damage.

- **Movement Pattern (conceptual)**: A configurable behavioural pattern
  controlling obstacle motion (examples: linear path between points, rotation
  around pivot, timed pauses).

- **Hazard Zone (conceptual)**: Area that switches between active and inactive
  states and applies effects (damage, slow, status) to entities inside while
  active.

- **Destructible Cover (conceptual)**: Obstacle with durability that blocks
  projectiles/vision/traversal and is removed when durability reaches zero.

- **Obstacle Configuration**: Metadata used by designers to tune movement speed,
  amplitude, delay, active/inactive schedule, effect strength and durability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Functionality)**: Each dynamic obstacle type (moving barrier, hazard
  zone, destructible cover) can be validated independently with an automated
  test scenario that demonstrates the expected runtime behaviour
  (blocking/unblocking, effect application, durability reduction and removal)
  with >= 95% test pass rate in CI.

- **SC-002 (AI & Movement)**: In automated integration tests, AI units detect
  and respond to dynamic obstacles (reroute, wait or fallback) in >= 99% of
  trials where a previously valid movement line becomes blocked.

- **SC-003 (Designer Tooling)**: Designers can create, configure and iterate on
  at least these three obstacle types in the debug Obstacle Editor; configuration
  changes are visible and verifiable in play-tests.

- **SC-004 (Performance)**: Under a stress scenario with 50 active dynamic
  obstacles in a single arena, the simulation should not fall below 80% of the
  performance baseline (measured on the same environment without dynamic
  obstacles enabled). Replace baseline with the current main branch measurement
  during implementation.

- **SC-005 (Reliability)**: The system must avoid deadlocks or permanent
  unreachable states in >= 99% of randomized test scenarios that combine moving
  obstacles and hazard zones.

## Assumptions

- Implementation will reuse existing runtime simulation systems and services in a
  way that respects the game’s performance constraints.
- This specification focuses on gameplay behaviour and authoring experiences;
  low-level engine changes may be necessary but are out-of-scope for the spec.

## Dependencies

- Pathfinding and line-of-sight logic availability and ability to be queried at runtime.
- Authoring/editor UI and inspector where designers can place and tune obstacle configuration.
- Test harness or deterministic simulation mode for automated validation.

## Out of Scope

- Network replication and authoritative multiplayer concerns unless clarified in the assumptions (see FR-008).
- Procedural generation of obstacle placement (this spec focuses on author-placed obstacles and configuration).

## Implementation Notes (developer-facing suggestions - not normative)

- Treat dynamic arena objects as first-class environment elements with changeable
  state and clear instrumentation to support deterministic validation and replay.
- Prefer movement and activation patterns that are predictable and configurable;
  provide means to evaluate schedules deterministically for automated validation.
- Designers should be able to tune durability and effect values through authoring tools without engineering intervention.
- Dev/debug tooling: expose a simple obstacle editor + spawner in the dev UI
  (with an optional visuals toggle) so designers can tweak movement speed/paths,
  hazard schedules, and durability and immediately observe runtime changes; keep
  this behind the dev server only.
