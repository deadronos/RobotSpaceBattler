# Feature Specification: Simulation — Concrete functional requirements & user stories

**Feature Branch**: `001-title-simulation-spec`
**Created**: 2025-10-03
**Status**: Draft
**Input**: User description: "Author concrete functional requirements and user stories for the
Simulation subsystem (AI, Weapons, Projectiles, Beams, Physics sync, FX, Respawn, Scoring).
Review memory-bank/designs and key src files to ground the spec. Be explicit about problem,
acceptance criteria, constraints, and testable acceptance tests; avoid committing to a tech
stack."

## Execution Flow (main)

1. Parse user description and confirm scope (Simulation subsystem: deterministic fixed-step loop,
   systems: AI, Weapons, Hitscan/Beam/Projectile, Damage, Scoring, Respawn, PhysicsSync, FX).
2. Extract actors and primary flows: Player/Tester (observes runs, toggles UI), Robot AI, Simulation
   Host, and systems that consume/produce events.
3. Identify ambiguous areas and list questions for clarification.
4. Produce testable functional requirements and user stories that map to current implementation
   files.
5. Provide acceptance tests and metrics that enable deterministic verification.

---

## ⚡ Quick Guidelines

- Focus on WHAT the Simulation must do and WHY.

- Avoid prescribing HOW (frameworks, exact APIs) — map to current files for context only.

- All functional requirements must be testable with unit and integration tests.

---

## User Scenarios & Testing (mandatory)

### Primary User Story
As a game developer or QA engineer, I want the Simulation subsystem to run a deterministic
fixed-step simulation that updates AI, resolves weapons (hitscan, beam, projectile), applies
damage and scoring, synchronizes authoritative physics positions to ECS for rendering, and
emits visual FX — so that gameplay is reproducible in tests and visually consistent for players.

### Acceptance Scenarios

1. Given a seeded simulation start state, when the simulation runs N fixed steps with identical
  seed and initial entity state, then the sequence of WeaponFired, Damage, and Death events must
  be identical across runs.
2. Given a robot that fires a gun (hitscan) at a target in line-of-sight, when WeaponSystem emits
   the WeaponFiredEvent and HitscanSystem runs, then a DamageEvent for the target must be
   produced and Health decreased accordingly.
3. Given a rocket weapon fired by Robot A, when the projectile collides within aoeRadius of Robot
   B, then an AoE DamageEvent must be emitted and DamageSystem must apply falloff damage to
   affected robots, respecting the friendly-fire toggle.
4. Given a Rapier RigidBody attached to an entity, when physics progresses, then PhysicsSyncSystem
   must copy the authoritative translation into the entity.position component and notify render
   subscribers (no direct mesh mutation).
5. Given a robot dies, when DamageSystem emits DeathEvent, then ScoringSystem and RespawnSystem
   must process the death according to team and respawn rules and produce consistent score
   updates and respawn events.

### Edge Cases

- Rapier APIs unavailable in tests: current behavior uses defensive try/catch and heuristic fallbacks.
  Requirement: graceful fallback to deterministic heuristics for tests.

- Projectile owner destroyed/respawned mid-flight: projectiles store ownerId at spawn; acceptance: use
  stored ownerId for damage and scoring regardless of owner lifecycle.

- Overlapping AoE: multiple projectiles explode same step — acceptance: damage calculations must be
  additive and deterministic given the seed.

- Respawn timing & simNowMs usage (determinism hole)

Files: RespawnSystem.ts, Simulation.tsx
Spec: All systems should be driven by StepContext.simNowMs for determinism.
Implementation: `respawnSystem` currently accepts an optional `now` parameter, but
Simulation calls `respawnSystem(world, events.death)` without providing `simNowMs`.
Because the system falls back to `Date.now()` the resulting respawn timings are
non-deterministic across runs, which breaks reproducibility of tests.

Clarification: RespawnSystem will require callers to provide `StepContext.simNowMs`.
Use of `Date.now()` as a fallback is no longer acceptable for deterministic behavior.
Simulation MUST be updated to pass `simNowMs` into RespawnSystem. Tests must
instantiate `FixedStepDriver` with a fixed seed and pass the driver's `simNowMs`
when invoking respawn logic.

---

## Requirements (mandatory)

### Functional Requirements

- FR-001: Simulation MUST run as a deterministic fixed-step loop that produces a StepContext with
  frameCount, simNowMs, seeded RNG, and step duration for every step. (See
  `src/utils/fixedStepDriver.ts`, `src/hooks/useFixedStepLoop.ts`.)

  Update: The in-app hook `useFixedStepLoop` and `Simulation` MUST implement
  elapsed-time accumulation so that on each render frame the loop can execute
  multiple fixed steps as needed to catch up. The hook must accept a maximum
  steps-per-frame safeguard and a test-mode toggle. Deterministic unit and
  integration tests SHOULD bypass `useFixedStepLoop` and use `FixedStepDriver`
  directly. Simulation must support a test-mode that accepts an external driver
  or `simNowMs` for deterministic control.

- FR-002: Systems MUST consume the StepContext RNG for any randomness, and random decisions must
  be reproducible for a given seed. (See usages in `WeaponSystem`, `ProjectileSystem`,
  `BeamSystem`, `AISystem`.)

- FR-003: WeaponSystem MUST manage weapon cooldowns, ammo, and emit WeaponFiredEvent objects
  without resolving damage directly. (See `src/systems/WeaponSystem.ts`.)

- FR-004: HitscanSystem MUST resolve gun-type WeaponFiredEvent via authoritative physics when
  available (Rapier raycast) and otherwise a deterministic heuristic; it MUST emit DamageEvent and
  ImpactEvent. (See `src/systems/HitscanSystem.ts` and `weapons-design.md`.)

- FR-005: BeamSystem MUST create beam entities for laser-type weapons, tick damage at defined
  intervals, and emit DamageEvents per tick. Beam lifetimes, tick intervals, and damage behavior
  MUST be testable and deterministic. (See `src/systems/BeamSystem.ts`.)

- FR-006: ProjectileSystem MUST spawn projectile entities for rocket-type weapons, optionally use
  RigidBody when available, update positions either from physics or via explicit velocity
  integration, handle homing behavior, lifespan, and AoE damage. Projectile collisions MUST produce
  DamageEvents and respect the friendly-fire toggle. (See `src/systems/ProjectileSystem.ts`.)

  Update: Systems MUST not read the global UI store (`useUI.getState()`) for
  game-rule toggles like friendly-fire. Instead, friendly-fire and similar
  session-level toggles MUST be provided via StepContext or explicit system
  parameters passed in from Simulation. ProjectileSystem and other affected
  systems must be updated to accept a `friendlyFire` boolean parameter (or read
  it from StepContext) to improve testability and determinism.

- FR-007: DamageSystem MUST consume DamageEvents, update Health components consistently, emit
  DeathEvent on lethal damage, and ensure determinism in damage application ordering. (See
  `src/systems/DamageSystem.ts`.)

- FR-008: ScoringSystem and RespawnSystem MUST process DeathEvents deterministically to update
  scores and queue respawns. ScoringSystem MUST classify deaths into: opponent kill,
  friendly-fire, or suicide; apply score updates deterministically (team +1 for opponent
  kills; attacker/team −1 for suicide or friendly-fire as applicable) and record a
  serializable audit entry for each death including: simNowMs, frameCount, victimId,
  killerId (if any), killerTeam, victimTeam, classification, and scoreDelta. Processing
  order MUST be deterministic (for example, by ascending entity id or event queue order)
  so that scoring traces are reproducible across runs. (See `src/systems/ScoringSystem.ts`,
  `src/systems/RespawnSystem.ts`.)

- FR-009: PhysicsSyncSystem MUST copy authoritative Rapier RigidBody translations into
  `entity.position` with change-thresholding to avoid spurious notifications; it MUST notify render
  subscribers when position changes. (See `src/systems/PhysicsSyncSystem.ts`.)

- FR-010: FXSystem MUST consume ImpactEvent and other visual events to produce renderable FX
  entities or event queues; FX behavior must not change game-state deterministically. (See
  `src/systems/FxSystem.ts`.)

- FR-011: The simulation MUST allow pausing and unpausing; on pause it MUST capture and restore
  velocities (see `src/ecs/pauseManager.ts`) and suspend the fixed-step loop while preserving
  deterministic behavior when resumed.

- FR-012: The system MUST provide deterministic fallback behavior for physics-dependent systems
  (raycasts, rigid bodies) when Rapier is not available in the test runtime, ensuring unit tests
  remain deterministic without the physics engine.

- FR-013: All systems MUST avoid mutating Three.js mesh transforms directly when a Rapier
  RigidBody is present; instead the RigidBody is authoritative and PhysicsSyncSystem carries
  positions into ECS. (Constitution rule: Physics-First Authority.)

- FR-014: Systems MUST emit events rather than directly performing side-effecting cross-cutting
  actions; event flows must be consumed by dedicated systems (DamageSystem, ScoringSystem,
  FXSystem) to keep single responsibility.

- FR-015: All new behavior added to the Simulation MUST be covered by unit tests and integration
  tests that use `FixedStepDriver` with seeded RNG for deterministic validation. (Constitution
  rule: Test-Driven Development.)

- FR-016: The simulation SHOULD maintain a short-lived, in-memory runtime event log capturing
  kill events (kill, friendly-fire kill, suicide) for observability and scoring audit during
  runtime. This log MUST NOT be persisted to disk by default and MUST be bounded in size
  (default capacity = 100 entries). Tests should be able to inspect this log for correctness.
  The ScoringSystem (or a dedicated ObservabilitySystem invoked by ScoringSystem) MUST append
  audit entries to this bounded log in a deterministic format using StepContext.simNowMs and
  other deterministic identifiers.

  Acceptance criteria (audit & export):

  - Export format: default export SHALL be newline-delimited JSON (NDJSON/JSONL).
    Each line represents one `DeathAuditEntry` in chronological order (oldest →
    newest) unless caller requests reverse ordering.

  - Schema: every exported entry MUST include these keys: `id`, `simNowMs`,
    `frameCount`, `victimId`, `killerId` (nullable), `victimTeam`, `killerTeam`
    (nullable), `classification`, `scoreDelta`. Additional diagnostic fields MAY
    be present but are optional.

  - Determinism: Given identical StepContext (seed, frameCount, simNowMs
    progression) and identical event inputs, exported NDJSON must be
    byte-for-byte identical across runs.

  - Capacity handling: exports that request more entries than available MUST
    return the available entries only; exports SHALL NOT mutate the runtime
    event log.

  - Performance: exporting 100 entries to JSONL SHALL complete within 50ms on a
    developer workstation (reasonable CI threshold may be higher). Tests should
    assert ordering and schema correctness; performance checks may be optional
    in unit tests but included in a small performance benchmark (T030).

- FR-017: Respawn policy: The simulation MUST respawn dead robots after a configurable fixed delay
  (default 5000 ms). Respawns MUST use a spawn queue to prevent overcrowding; newly respawned robots
  MUST receive a brief invulnerability period (default 2000 ms) to avoid immediate kills. The
  respawn location selection SHOULD prefer team spawn points and attempt to avoid immediate
  proximity to enemies when possible.

  Acceptance criteria (spawn placement):

  - Minimum distance: every respawned robot SHALL be placed at least
    `minSpawnDistance` units away from any enemy entity. Default
    `minSpawnDistance` = 3.0 units (game units/meters).

  - Spawn retries: when a chosen spawn point violates the minimum distance
    constraint, the RespawnSystem SHALL attempt up to `maxSpawnRetries`
    (default = 10) alternative placements before falling back to the team
    spawn point regardless of proximity.

  - Spawn zone capacity: a single spawn zone SHALL not accept more than
    `maxSpawnPerZone` simultaneous pending respawns (default = 3) to prevent
    overcrowding. New respawn requests beyond capacity SHALL be queued for the
    next available slot.

  - Deterministic placement: any randomized offset applied to a spawn position
    MUST be drawn from StepContext.rng so that placement is reproducible for
    identical seeds.

  - Testability: `tests/integration/spawnPlacement.test.ts` MUST assert the
    above thresholds deterministically by seeding the FixedStepDriver and
    verifying placement distances and queue behavior across deterministic runs.

- FR-018: Systems that resolve entity targets (for example, AI decision logic and weapon resolution)
  MUST use canonicalized gameplay IDs (via project helpers/getters) when emitting or persisting
  target references. These systems MUST not call id-canonicalization utilities with undefined
  values; when a target does not have a resolvable gameplay id the system MUST handle the case
  deterministically (for example: treat as 'no target' and avoid transitioning to an engage state
  or firing). Unit tests MUST cover this fallback behavior.

### Key Entities

- Entity: Robot — has `position`, `rigid` (optional), `team`, `weapon`, `weaponState`, `health`,
  `ai` components.

- Entity: Projectile — `position`, `velocity`, `projectile` payload, `team`, `ownerId`, `lifespan`.

- Entity: Beam — `beam` payload, `position` (origin), `direction`, `activeUntil`.

- Events: WeaponFiredEvent, DamageEvent, ImpactEvent, DeathEvent, SpawnEvent.

---

## Review & Acceptance Checklist

### Content Quality

- [x] No implementation details that prescribe languages or frameworks.

- [x] Focused on user value and business needs (deterministic, testable simulation).

- [x] Written for stakeholders and testers.

- [x] All mandatory sections completed.

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain (see below)

- [x] Requirements are testable and unambiguous where possible.

- [x] Success criteria are measurable.

- [x] Scope is clearly bounded to Simulation subsystem.

- [x] Dependencies and assumptions identified.

---

## Clarifications

### Session 2025-10-03

- Q: Scoring rules (suicides/friendly-fire/assists) → A: A (Implement full spec scoring: +1
  opponent kills; −1 for suicide; −1 for friendly-fire. ScoringSystem appends a bounded
  in-memory audit log entry for each kill with classification, simNowMs, killerId, victimId,
  and team information.)

- Q: Path style for plans and artifacts → A: A (Use repository-relative paths only; avoid
  hardcoding absolute filesystem paths in plans and specs).

### Session 2025-10-04

- Q: Tie-breaker for raycast hits when multiple colliders are at identical `toi` → A: Deterministic stable hash of collider metadata (sorted keys JSON).

---

## Ambiguities & Questions (NEEDS CLARIFICATION)

1. Respawn rules: RESOLVED — Fixed delay + spawn queue; respawned player receives 2s invulnerability.
2. Scoring rules: RESOLVED — Full scoring rules selected: team +1 for opponent kills;
   suicide −1 to killer's team; friendly-fire −1 to attacker. ScoringSystem MUST classify
   deaths and append a bounded in-memory audit entry for each kill (see FR-016).
3. Perf/scale targets: RESOLVED — Target capacity: up to 500 active entities (robots + projectiles +
   beams). This target should guide pooling and query optimization decisions.
4. Deterministic logging: RESOLVED — In-memory bounded log (last 100 events), no persistence by
   default. Export on demand is possible but not required.
5. Multiplayer/network: RESOLVED — Lockstep-ready serialization required; events and entity state
   must be serializable deterministically for lockstep synchronization.

---

## Non-Functional Requirements

- NFR-001: Performance target — the simulation must support up to 500 active entities (robots +
  projectiles + beams) under typical conditions; tests should benchmark and validate performance at

---

## Rendering Loop Synchronization (rAF TickDriver)

Problem: With `frameloop="demand"`, the current TickDriver uses `setInterval` while Rapier can
run its own internal timing using `requestAnimationFrame` (`updateLoop="independent"`). The two
loops are not synchronized which may cause uneven invalidations and perceived jitter.

Requirement: The TickDriver MUST be rAF-driven to align with the browser render cadence while
preserving deterministic fixed-step behavior. On each rAF tick, it shall accumulate elapsed time,
compute the number of fixed steps to catch up (capped), and call `invalidate()` accordingly.
Pausing MUST suspend rAF scheduling; resuming MUST restart deterministically.

Acceptance:

- Given mocked rAF timestamps and a configured fixed-step, the driver MUST request the expected
  number of invalidations per tick and cap steps-per-frame.
- With `updateLoop="independent"`, Simulation remains authoritative for gameplay logic using
  StepContext, while Rapier continues advancing physics; visuals remain coherent under tests.
- If a follow mode provides better coherence without hurting determinism, switching to
  `updateLoop="follow"` is acceptable if validated by tests.
  this scale.

- NFR-002: Serialization: events and entities used in synchronization MUST be serializable
  deterministically (stable ordering, no floating-point randomness in serialization) to enable
  lockstep networking in future integrations.

---

## Testing & Acceptance Criteria (mandatory)

### Determinism Tests (required)

- DT-001: Seeded reproducibility: Run the same initial world + seed through `FixedStepDriver` for
  1000 steps; assert that sequences of `WeaponFiredEvent`, `DamageEvent`, and `DeathEvent` match a
  saved golden trace.

- DT-002: RNG isolation: Verify that per-step RNG in `FixedStepDriver` yields the same sequence when
  seed is constant; ensure systems use provided RNG only.

### Unit Tests (required)

- UT-001: `WeaponSystem` unit tests validating cooldown consumption, ammo depletion, reloading, and
  WeaponFiredEvent shape.

- UT-002: `ProjectileSystem` unit tests for homing behavior, AoE damage falloff, lifespan
  expiration, and ownerId preservation across owner death.

- UT-003: `PhysicsSyncSystem` test ensuring rigid translation updates `entity.position` only when
  threshold exceeded and triggers notify.

- UT-004: `HitscanSystem` tests: both Rapier-based raycast success path (mocked) and deterministic
  fallback heuristic path.

- UT-005: `BeamSystem` tests for tick intervals and damage ticks.

- UT-006: `Observability` test: verify the in-memory runtime event log records kill, friendly-fire
  kill, and suicide events and respects size bounds.

- UT-007: `Respawn` test: verify respawn delay (configurable), spawn queue behavior, and temporary
  invulnerability on respawn (2s) preventing immediate re-death.

### Integration Tests (required)

- IT-001: Full weapon → damage → death → scoring → respawn flow test in
  `SimulationIntegration.test.tsx` with a controlled seed.

- IT-002: Projectile AoE overlap test verifying deterministic additive damage and friendly-fire toggle
  behavior.

- IT-003: Performance benchmark: run simulation with 500 active entities and verify step times remain
  within acceptable bounds (TBD; suggest <16ms per step as a target for dev machines).

- IT-004: Serialization test: verify that event and entity serialization is stable and deterministic
  across runs with identical seed and entity state.

### Playwright / E2E (optional)

- E2E-001: Smoke test ensures app boots, canvas renders, and an initial robot spawns (existing
  Playwright smoke test). Extend with a visual check that firing an initial wave renders impact FX.

---

## Constraints, Non-Goals, and Trade-offs

- Constraint C-001: Physics-First Authority must be preserved; the Rapier RigidBody is authoritative
  for position when present.

- Constraint C-002: Determinism is mandatory for unit/integration tests; any nondeterministic
  behavior must be isolated and flagged.

- Constraint C-003: Keep systems small and pure where possible (<300 lines) and export pure testable
  functions.

- Non-Goal NG-001: This spec does not mandate a networking protocol or multiplayer synchronization
  strategy.

- Non-Goal NG-002: This spec does not require replacing procedural robot art or GLTF asset imports.

- NFR-001: Performance target — the simulation must support up to 500 active entities (robots +
  projectiles + beams) under typical conditions; tests should benchmark and validate performance at
  this scale.

---

## Implementation Notes & Risks

- Risk R-001: Rapier API differences in test vs runtime could cause behavior divergence. Mitigation:
  defensive wrappers and deterministic fallbacks (already present in codebase). Add unit tests
  exercising both paths.

- Risk R-002: Owner lifecycle and sourceId preservation — current mitigation: projectile stores
  ownerId at spawn; tests must assert scoring uses stored ownerId.

- Risk R-003: AoE stacking and numerical differences — acceptance tests must assert tolerance and
  deterministic ordering for damage application.

- Risk R-004: Performance under high projectile counts — consider pooling and optimized queries if
  performance targets identified.

- Risk R-005: Module-scoped counters and Math.random/Date.now usage in
  `BeamSystem.ts`, `ProjectileSystem.ts`, and `FxSystem.ts` can cause
  non-deterministic IDs and flaky tests. Mitigation: adopt the deterministic-prefix+
  UUID strategy for rendering IDs and use StepContext-provided RNG or per-step counters
  for gameplay IDs. Update these files to remove module-scoped counters and avoid
  Date.now() fallback where deterministic simNowMs should be used.

- Risk R-006: Current `useFixedStepLoop` ties stepping to render frames and does not
  accumulate elapsed time, which can diverge from FixedStepDriver behavior under
  varying framerates. Mitigation: require accumulation in `useFixedStepLoop` and
  provide a test-mode to inject the driver for deterministic runs.

- Note: `src/systems/ProjectileSystem.ts` MUST be updated to accept a friendlyFire boolean
  rather than calling `useUI.getState()`. Add a mapping in the Simulation orchestration to
  supply session-level flags into StepContext.

- Note: Plans and spec artifacts MUST reference repository-relative paths (for example:
  `src/components/Simulation.tsx`, `specs/001-title-simulation-spec/spec.md`) instead of
  absolute filesystem paths. This avoids environment-specific hardcoding and improves
  portability of generated artifacts and instructions.

<!-- integration note: adapter parity tie-breaker recorded above; see physics-adapter-contract.md for canonical rules -->

---

## Files & Mapping to Current Implementation

- Simulation orchestration: `src/components/Simulation.tsx` (fixed-step loop ordering)

- Deterministic driver: `src/utils/fixedStepDriver.ts`, `src/hooks/useFixedStepLoop.ts`

- RNG implementation: `src/utils/seededRng.ts`

- Weapon coordinator: `src/systems/WeaponSystem.ts`

- Hitscan resolver: `src/systems/HitscanSystem.ts`

- Beam resolver: `src/systems/BeamSystem.ts` (update ID generation and use StepContext RNG)

- Projectile resolver: `src/systems/ProjectileSystem.ts` (replace module counters with deterministic ID strategy)

- Physics sync: `src/systems/PhysicsSyncSystem.ts`

- Damage & death: `src/systems/DamageSystem.ts`

- Scoring & respawn: `src/systems/ScoringSystem.ts`, `src/systems/RespawnSystem.ts`

- FX rendering: `src/systems/FxSystem.ts` and `src/components/FXLayer.tsx` — make FX IDs
  include a deterministic prefix and avoid using Math.random() for FX identifiers.

---

## Performance target (finalized)

The project has adopted a concrete developer/CI performance target for fixed-step simulation:

- Baseline target: 16ms average per fixed-step when exercising 500 active entities under the
  benchmark harness. This target is enforced via the `PERFORMANCE_TARGET_MS`/`PERFORMANCE_STRICT`
  environment variables in CI and local performance runs. See `specs/001-title-simulation-spec/plan.md` for
  the policy rationale and CI job patterns.

Acceptance: the IT-003 performance benchmark and `tests/performance.benchmark.test.ts` assert the
average step time against this target; CI uses `npm run ci:test:perf` to gate on `PERFORMANCE_STRICT`.

### Physics adapter parity (summary)

Physics-dependent systems (Hitscan, Projectile, Spawn proximity checks) must rely on a
small physics adapter interface. To ensure deterministic unit tests and reproducible
behavior across environments, the project requires parity between the Rapier-backed
adapter and the deterministic testing adapter. The parity contract is specified in:

- `specs/001-title-simulation-spec/contracts/physics-adapter-contract.md`

The contract enumerates the exact returned fields, error behaviors, and ordering guarantees
for adapter operations (raycast, overlap checks, proximity queries). Implementations and
tests must reference that contract for acceptance.

<!-- integration note: adapter parity tie-breaker recorded above; see physics-adapter-contract.md for canonical rules -->
