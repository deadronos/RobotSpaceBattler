
# Feature Specification: 3D Team Fight — Extend 001 & 002

> **Physics Scale Reference**: See
> [006-dynamic-arena-obstacles/spec.md](../006-dynamic-arena-obstacles/spec.md#physics-scale--collider-design-decisions-2025-12-10)
> for world unit scale (1:1 meters) and collider sizing decisions.

**Feature Branch**: `003-extend-placeholder-create`  
**Created**: 2025-10-17  
**Status**: Draft  
**Input**: User description: "extend-placeholder create a fully 3d team fight autobattler extending 001 and 002 spec to build better graphics and integrate with background simulation"
 
## Clarifications

### Session 2025-10-17

- Q: When the renderer can't keep up with the simulation timing, should the renderer follow the simulation timestamps strictly, tie playback to renderer frames, or use a hybrid approach with interpolation/extrapolation and an optional frame-step debug mode? → A: C (Hybrid: renderer follows simulation timestamps as source of truth but uses interpolation/extrapolation to smooth visuals; supports optional frame-step debug mode)
- Q: What timestamp format should MatchTrace events use to synchronize simulation and renderer? → A: D (Both: include integer ms since match start and an optional frameIndex)

- Q: Should the simulation record randomness so replays are exact? → A: B (Record & expose RNG seed (single integer) with each MatchTrace; replay uses the seed for exact deterministic simulation)

- Q: How should RNG identity be captured to ensure cross-implementation deterministic replay? → A: B (Record `rngSeed` and an `rngAlgorithm` identifier string in MatchTrace metadata, e.g. `{"rngSeed":12345, "rngAlgorithm":"xorshift32-v1"}`)

- Q: What ordering rule should MatchTrace enforce when multiple events share the same `timestampMs`? → A: B (Stable ordering by `timestampMs`, then `sequenceId` assigned by the simulation to break ties)

- Q: What implementation and test format should the FR-009-A contract validator use? → A: B (TypeScript validator using JSON Schema (ajv) + Vitest tests to integrate with the repo and provide strong typing and automated assertions)
- Q: What timestamp format should MatchTrace events use to synchronize simulation and renderer? → A: D (Both: include integer ms since match start and an optional frameIndex)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a 3D Team Fight Match (Priority: P1)

As a player or demo viewer I want to run a fully automated 3D team-vs-team fight so I can watch matches that showcase improved graphics and accurate battle outcomes driven by the background simulation.

**Why this priority**: This is the core value: demonstrate integrated simulation + graphics and provide a playable/demo-able feature that stakeholders can evaluate.

**Independent Test**: Launch the simulation in the existing dev scene and observe a complete match from spawn to victory; verify that visuals render in 3D, teams spawn correctly, projectiles and collisions are visible, and winning team is identified by the simulation.

**Acceptance Scenarios**:

1. **Given** the app has a valid team configuration and the simulation service is available, **When** a match starts, **Then** two teams of robots spawn in the arena with 3D models, move, fire projectiles, and the match runs to completion with a single winning team displayed.
2. **Given** the simulation deterministically produces a winner, **When** the match ends, **Then** the HUD shows the winning team, a short replay camera pans the arena, and the match result is recorded in-memory.

---

### User Story 2 - Visual Quality & Graphics Options (Priority: P2)

As a designer or QA reviewer I want configurable visual quality settings for the 3D match so I can trade performance vs fidelity during demos and tests.

**Why this priority**: Visual improvements are the primary purpose of this spec; enabling runtime quality tuning ensures we can validate both high-fidelity and low-cost modes.

**Independent Test**: Toggle visual quality before or during a match and verify that lights, shadows, particle effects, and post-processing change accordingly while the simulation continues to run.

**Acceptance Scenarios**:

1. **Given** the match is running, **When** I switch to "High" visual mode, **Then** enhanced effects (soft shadows, higher-res textures, particle density) are visible and frame rate may drop but the simulation outcome remains unchanged.
2. **Given** the match is running in "Low" mode, **When** I switch to "Performance" mode, **Then** the renderer uses simplified materials and fewer particles and the simulation still completes correctly.

---

### User Story 3 - Deterministic Replay & Simulation Sync (Priority: P2)

As an engineer I want the visual playback to reflect the background simulation deterministically so that recorded matches can be replayed and validated for correctness.

**Why this priority**: Ensures simulation and rendering are decoupled but synchronized, enabling debugging, testing, and reproducible demos.

**Independent Test**: Run a match, record simulation events (spawns, shots, hits), then play them back in the renderer and assert that entity positions, health, and outcomes match the recorded simulation timeline.

**Acceptance Scenarios**:

1. **Given** a recorded simulation trace, **When** the renderer replays the trace, **Then** entity transforms, projectile trajectories, and hit events occur at the same timestamps as the recorded trace within an acceptable tolerance (e.g., ±16ms / 1 frame at 60fps).
	- `specs/003-extend-placeholder-create/schemas/matchtrace.schema.json` — JSON Schema for MatchTrace


## Clarifications

### Session 2025-10-17

- Q: When the renderer can't keep up with the simulation timing, should the
	renderer follow the simulation timestamps strictly, tie playback to renderer
	frames, or use a hybrid approach with interpolation/extrapolation and an
	optional frame-step debug mode? → A: C (Hybrid: renderer follows simulation
	timestamps as source of truth but uses interpolation/extrapolation to smooth
	visuals; supports optional frame-step debug mode)
- Q: What timestamp format should MatchTrace events use to synchronize
	simulation and renderer? → A: D (Both: include integer ms since match start
	and an optional frameIndex)

- Q: What ordering rule should MatchTrace enforce when multiple events share
	the same `timestampMs`? → A: B (Stable ordering by `timestampMs`, then
	`sequenceId` assigned by the simulation to break ties)

- Q: What implementation and test format should the FR-009-A contract
	validator use? → A: B (TypeScript validator using JSON Schema (ajv) + Vitest
	tests to integrate with the repo and provide strong typing and automated
	assertions)
- Q: What timestamp format should MatchTrace events use to synchronize
	simulation and renderer? → A: D (Both: include integer ms since match start
	and an optional `frameIndex`)

- Q: Should the simulation record randomness so replays are exact? → A: B
	(Record & expose RNG seed (single integer) with each MatchTrace; replay uses
	the seed for exact deterministic simulation)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a 3D Team Fight Match (Priority: P1)

As a player or demo viewer I want to run a fully automated 3D team-vs-team fight
so I can watch matches that showcase improved graphics and accurate battle
outcomes driven by the background simulation.

**Why this priority**: This is the core value: demonstrate integrated
simulation + graphics and provide a playable/demo-able feature that
stakeholders can evaluate.

**Independent Test**: Launch the simulation in the existing dev scene and
observe a complete match from spawn to victory; verify that visuals render in
3D, teams spawn correctly, projectiles and collisions are visible, and winning
team is identified by the simulation.

**Acceptance Scenarios**:

1. **Given** the app has a valid team configuration and the simulation service
	 is available, **When** a match starts, **Then** two teams of robots spawn in
	 the arena with 3D models, move, fire projectiles, and the match runs to
	 completion with a single winning team displayed.
2. **Given** the simulation deterministically produces a winner, **When** the
	 match ends, **Then** the HUD shows the winning team, a short replay camera
	 pans the arena, and the match result is recorded in-memory.

---

### User Story 2 - Visual Quality & Graphics Options (Priority: P2)

As a designer or QA reviewer I want configurable visual quality settings for the
3D match so I can trade performance vs fidelity during demos and tests.

**Why this priority**: Visual improvements are the primary purpose of this
spec; enabling runtime quality tuning ensures we can validate both
high-fidelity and low-cost modes.

**Independent Test**: Toggle visual quality before or during a match and verify
that lights, shadows, particle effects, and post-processing change accordingly
while the simulation continues to run.

**Acceptance Scenarios**:

1. **Given** the match is running, **When** I switch to "High" visual mode,
	 **Then** enhanced effects (soft shadows, higher-res textures, particle
	 density) are visible and frame rate may drop but the simulation outcome
	 remains unchanged.
2. **Given** the match is running in "Low" mode, **When** I switch to
	 "Performance" mode, **Then** the renderer uses simplified materials and
	 fewer particles and the simulation still completes correctly.

---

### User Story 3 - Deterministic Replay & Simulation Sync (Priority: P2)

As an engineer I want the visual playback to reflect the background simulation
deterministically so that recorded matches can be replayed and validated for
correctness.

**Why this priority**: Ensures simulation and rendering are decoupled but
synchronized, enabling debugging, testing, and reproducible demos.

**Independent Test**: Run a match, record simulation events (spawns, shots,
hits), then play them back in the renderer and assert that entity positions,
health, and outcomes match the recorded simulation timeline.

**Acceptance Scenarios**:

1. **Given** a recorded simulation trace, **When** the renderer replays the
	 trace, **Then** entity transforms, projectile trajectories, and hit events
	 occur at the same timestamps as the recorded trace within an acceptable
	 tolerance (e.g., ±16ms / 1 frame at 60fps).

---

### Edge Cases

- If one or more team members fail to spawn (missing asset or data), the match
	should abort gracefully and surface a clear error in the dev console and
	HUD.
- If the renderer falls behind (low frame rate), the background simulation
	must continue and the renderer should interpolate/extrapolate visuals to
	avoid corrupting simulation state.
- If assets (models/textures) fail to load mid-match, use a placeholder visual
	and continue the simulation.

## Out of scope

- Networked multiplayer / online matchmaking is explicitly excluded from this
	feature. This spec focuses on local, single-process automated matches and
	renderer integration only.
- Persistent cloud storage, persistent match history, leaderboards, or cloud
	analytics are excluded. The system MAY provide a simple local export of a
	match trace or match summary as JSON for offline analysis, but no backend
	persistence is required.
- Any non-visual simulation features such as AI training pipelines, machine
	learning models, or continuous learning systems are excluded from this
	feature; the simulation used here is deterministic and designed for
	playback and testing, not model training.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST be able to start a fully automated 3D
	team-vs-team match driven by the background simulation with no player
	inputs required.
- **FR-002**: The renderer MUST display 3D robot models, projectiles, particle
	effects, and basic lighting that reflect simulation events (spawns,
	movements, shots, hits, destruction).
- **FR-003**: The simulation and renderer MUST be decoupled and synchronized
	via a timeline or event stream such that the renderer can deterministically
	replay simulation events.
- **FR-004**: The feature MUST provide runtime visual quality modes (e.g.,
	High, Medium, Low) that change renderer fidelity without affecting simulation
	logic.
- **FR-005**: The system MUST record a simulation trace (timestamped events)
	for each match and expose a playback mode that replays the trace in the
	renderer.
	- Implementation note: MatchTrace events SHOULD include a monotonic
	  `timestampMs` (integer milliseconds since match start) as the primary
	  timebase and MAY include an optional `frameIndex` (integer) to support
	  deterministic frame-stepped playback and debugging. The MatchTrace
	  (trace-level metadata) SHOULD also include a global `rngSeed` (integer)
	  used by the simulation for that match so replay implementations can seed
	  their RNG and achieve exact deterministic replays.
- **FR-006**: The system MUST present a HUD at match end that shows match
	summary: team names, surviving units, and winner.
- **FR-007**: The renderer MUST fall back to placeholder assets if an asset
	fails to load and must not crash the simulation.
- **FR-008**: The system MUST allow a short automatic cinematic camera sweep
	at match end to showcase the outcome.
- **FR-009**: The feature MUST be compatible with the existing contracts and
	data shapes defined in specs 001 and 002 (team definitions, entity
	attributes, scoring, spawn contracts).
- **FR-009-A (Acceptance)**: Provide a clear contract validation checklist that
	will be used during testing to confirm compatibility with specs 001 and 002.
	At minimum, validate the following fields exist and have expected semantics:

- **FR-009-A (Acceptance)**: Provide a contract validation checklist for
	testing compatibility with `specs/001-3d-team-vs/spec.md` and
	`specs/002-3d-simulation-graphics/spec.md`. Validate the presence and
	semantics of these items (field names shown as expected):

	1) Team
		- Fields: `id`, `name`, `units[]`, `spawnPoints[]`.
		- Reference: `specs/001-3d-team-vs/spec.md` → "### Key Entities" →
		  **Team**; also see FR-001 and FR-014 for spawn/initialization behavior.

	2) Unit / Entity (Robot)
		- Fields: `id`, `modelRef`, `teamId` (or `team`), `maxHealth` (or
		  `currentHealth`), `weapons[]`.
		- Reference: `specs/001-3d-team-vs/spec.md` → "### Key Entities" →
		  **Robot**; and `specs/002-3d-simulation-graphics/spec.md` → "## Key
		  Entities" → **Robot** (explicit fields: `id`, `team`, `currentHealth`,
		  `statusFlags`, `currentTarget`, `isCaptain`).

	3) Spawn contract
		- Fields: `spawnPointId`, `entityId`, `teamId`, `initialTransform`.
		- Reference: `specs/001-3d-team-vs/spec.md` → FR-001 and "### Key
		  Entities" → **Arena** (spawn zones). Spawn events in MatchTrace should
		  reference the same spawn identifiers.

	4) Scoring contract
		- Fields: `teamId`, `scoreDelta`, `eventType`.
		- Reference: `specs/001-3d-team-vs/spec.md` → FR-019 (post-battle stats)
		  and FR-006 (victory determination and stats UI).

	5) MatchTrace event types
		- Expected event types and semantics: `spawn`, `move`, `fire`, `hit`,
		  `damage`, `death`, `score`.
		- Reference: `specs/002-3d-simulation-graphics/spec.md` → "Session
		  2025-10-14" Clarifications (delivery pattern: event push + per-frame
		  snapshots) and `specs/001-3d-team-vs/spec.md` → "### Key Entities"
		  (Projectile/Simulation State) for payload guidance.

	**FR-009-A (Independent Test)**: Implement a contract validator that loads a
	 sample team definition and a sample MatchTrace and confirms the presence
	 and structure of the fields above. The validator must point to the
	 referenced files/headings as the normative mapping. The check passes if
	 all required fields are present and map sensibly to simulation events.

	Implementation note: The contract validator will be implemented in
	TypeScript and use JSON Schema validation (for example `ajv`) to perform
	structural checks. Tests will be written using the project's existing
	Vitest setup so the validator can run as part of CI. Recommended artifacts:

	- `specs/003-extend-placeholder-create/schemas/team.schema.json` — JSON
	  Schema for Team
	- `specs/003-extend-placeholder-create/schemas/matchtrace.schema.json` —
	  JSON Schema for MatchTrace
	- `tests/contract-validator.spec.ts` — Vitest test harness that loads
	  example payloads and asserts schema validity

	This approach keeps the validator strongly-typed, automatable, and
	consistent with the repo's TypeScript toolchain.

Data shape guidance (hit & damage events): For deterministic replay and
clear validation, prefer separate `hit` and `damage` events:

- `hit` event fields:
	- `type: 'hit'`
	- `timestampMs`
	- `attackerId`
	- `targetId`
	- `position` (x,y,z)
	- `projectileId` (optional)
	- `collisionNormal` (optional)

- `damage` event fields:
	- `type: 'damage'`
	- `timestampMs`
	- `targetId`
	- `amount`
	- `resultingHealth`
	- `sourceEventId` (optional link to the `hit` event)

Include these shapes in `matchtrace.schema.json` so the validator can assert
both presence and semantics of collision vs damage recording.

- **FR-010**: The system MUST provide debug logging and an in-memory match
	record suitable for automated tests.

- **FR-011**: The feature MUST comply with repository code-size governance: any
  `src/` file that exceeds 300 lines of code (LOC) MUST be addressed with a
  documented refactor plan. The plan MUST be attached to the feature's spec or
  issued as a linked task and include:
  1. The oversized file path(s).
  2. A short justification for why the file grew past 300 LOC.
  3. A concrete split proposal listing new modules/files to create and the
	  expected public API for each.
  4. One or more actionable tasks (2–4 hour chunks) tracked under `specs/003-*/tasks` or
	  an equivalent issue tracker entry. The first task should be marked as in-progress
	  when work begins.

  The repository's constitution ("Size & Separation Limits") describes the
  mandatory workflow and reviewer responsibilities for oversized files.

*Assumptions*: This spec extends and reuses the team, spawn, and scoring
contracts from `specs/001-3d-team-vs` and simulation/graphics decisions from
`specs/002-3d-simulation-graphics`. The implementation will avoid specifying
frameworks or file formats.

### Key Entities *(include if feature involves data)*

- **MatchTrace**: Timestamped event stream produced by the background
	simulation; events include spawn, move, fire, hit, damage, death, score.
	- Timing fields (clarified): Each MatchTrace event MUST include a
		monotonic timebase and may include a frame reference. Recommended fields:
		- `timestampMs` (integer): milliseconds since match start (monotonic).
			Primary timebase for synchronization and interpolation.
		- `frameIndex` (integer, optional): frame number useful for deterministic
			frame-stepped playback and debugging.
		- `sequenceId` (integer, optional): strictly increasing integer assigned
			by the simulation to break ties for events with identical `timestampMs`.
			Use for deterministic ordering.
		- `rngSeed` (integer, optional): global RNG seed used by the simulation
			for this match; including this at trace start allows exact deterministic
			replay when the same RNG algorithm and seed are used.
		- `rngAlgorithm` (string, optional): identifier for the RNG algorithm and
			version used (e.g., `"xorshift32-v1"`). Including this alongside the
			seed allows cross-implementation compatibility or explicit replay
			warnings when the algorithm is unsupported.
- **Team**: Collection of robot entity definitions with attributes
	(id, modelRef, teamId, initialPosition, health).
- **RenderedEntity**: Visual representation of a simulation entity; maps to a
	MatchTrace entity id and exposes transform, material state, and VFX state.
- **VisualQualityProfile**: Named preset (High/Medium/Low) that determines
	renderer parameters (shadow quality, particle density, texture resolution).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A full automated match (spawn to victory) can be executed
	end-to-end and completed successfully in at least 95% of attempts in the
	dev environment (stability).
- **SC-002**: Replay accuracy: When replaying a recorded MatchTrace, 95% of
	critical events (spawn, hit, death) must occur within ±16ms of their
	recorded timestamps.
- **SC-003**: Visual fidelity toggle: Switching between visual quality
	profiles while a match is running must not change the match outcome (100%
	of matches yield same winner across profiles in deterministic simulation
	runs).
- **SC-004**: The renderer must not crash or halt the simulation due to
	missing assets in 100% of observed failure scenarios; placeholders must be
	used.
- **SC-005**: Match summary HUD and cinematic sweep are shown within 2
	seconds of match end in 95% of runs.

