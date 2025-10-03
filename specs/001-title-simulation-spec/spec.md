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

---

## Requirements (mandatory)

### Functional Requirements
- FR-001: Simulation MUST run as a deterministic fixed-step loop that produces a StepContext with
  frameCount, simNowMs, seeded RNG, and step duration for every step. (See
  `src/utils/fixedStepDriver.ts`, `src/hooks/useFixedStepLoop.ts`.)

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

- FR-007: DamageSystem MUST consume DamageEvents, update Health components consistently, emit
  DeathEvent on lethal damage, and ensure determinism in damage application ordering. (See
  `src/systems/DamageSystem.ts`.)

- FR-008: ScoringSystem and RespawnSystem MUST process DeathEvents deterministically to update
  scores and queue respawns. (See `src/systems/ScoringSystem.ts`,
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

- FR-016: The simulation SHOULD maintain a short-lived, in-memory runtime event log capturing kill
  events (kill, friendly-fire kill, suicide) for observability and scoring audit during runtime.
  This log MUST NOT be persisted to disk by default and MUST be bounded in size (e.g., last 100
  events). Tests should be able to inspect this log for correctness.

- FR-017: Respawn policy: The simulation MUST respawn dead robots after a configurable fixed delay
  (default 5s). Respawns MUST use a spawn queue to prevent overcrowding; newly respawned robots
  MUST receive a brief invulnerability period (2s) to avoid immediate kills. The respawn location
  selection SHOULD prefer team spawn points and attempt to avoid immediate proximity to enemies when
  possible.

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

- Q: Scoring rules (suicides/friendly-fire/assists) → A: B (Team scoring: team +1 for opponent kills;
  suicide −1 to killer's team; friendly-fire −1 to attacker).
- Q: Respawn policy → A: C (Fixed delay + spawn queue; respawned player gets 2s invulnerability).
- Q: Perf target → A: B (Medium — up to 500 active entities).
- Q: Deterministic logging → A: A (In-memory bounded log (last 100 events), no persistence).
- Q: Networking serialization → A: B (Lockstep-ready: events/entities must be serializable
  deterministically for lockstep sync).

---

## Ambiguities & Questions (NEEDS CLARIFICATION)
1. Respawn rules: RESOLVED — Fixed delay + spawn queue; respawned player receives 2s invulnerability.
   (Configurable delay; default 5s recommended.)
2. Scoring rules: RESOLVED — Team scoring selected per session: team +1 for opponent kills; suicide
   −1 to killer's team; friendly-fire −1 to attacker.
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

---

## Files & Mapping to Current Implementation
- Simulation orchestration: `src/components/Simulation.tsx` (fixed-step loop ordering)
- Deterministic driver: `src/utils/fixedStepDriver.ts`, `src/hooks/useFixedStepLoop.ts`
- RNG implementation: `src/utils/seededRng.ts`
- Weapon coordinator: `src/systems/WeaponSystem.ts`
- Hitscan resolver: `src/systems/HitscanSystem.ts`
- Beam resolver: `src/systems/BeamSystem.ts`
- Projectile resolver: `src/systems/ProjectileSystem.ts`
- Physics sync: `src/systems/PhysicsSyncSystem.ts`
- Damage & death: `src/systems/DamageSystem.ts`
- Scoring & respawn: `src/systems/ScoringSystem.ts`, `src/systems/RespawnSystem.ts`
- FX rendering: `src/systems/FxSystem.ts`, `src/components/FXLayer.tsx`

---

## Review Checklist (for PR submission)
- [ ] Add/Update unit tests covering any new behavior
- [ ] Add deterministic integration test(s) using `FixedStepDriver` and seeded RNG
- [ ] Update `SPEC.md` and memory-bank design docs if system responsibilities change
- [ ] Ensure all new physics interactions preserve Physics-First rule
- [ ] Run `npm run test` and `npm run playwright:test` (dev server port 5174) where relevant

---

## Execution Status
- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed
