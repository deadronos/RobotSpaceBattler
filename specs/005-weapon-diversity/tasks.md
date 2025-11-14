```markdown
---
title: "Tasks — Weapon Diversity (005)"
---

# Tasks: Weapon Diversity (005)

**Input**: Design documents from `specs/005-weapon-diversity/` (see `plan.md`, `spec.md`,
`data-model.md`, `research.md`, `contracts/`).

**Prerequisites**: Foundation tasks (Phase 1 & 2) must complete before user stories.

---

## Phase 1: Setup (Shared infrastructure)

Purpose: Create the minimal project scaffolding and placeholders required to implement and
test the feature.

- [X] T001 [P] Create TypeScript weapon types file at `src/lib/weapons/types.ts`.
	(WeaponProfile, BalanceMultipliers, ProjectileInstance, ExplosionEvent,
	WeaponTelemetry, TelemetryAggregator)
- [X] T002 [P] Add placeholder VFX assets and README in
	`public/assets/vfx/weapon-placeholders/`.
	(placeholder files: `rocket-placeholder.png`, `laser-placeholder.png`, `gun-placeholder.png`).
- [X] T003 [P] Add duel-matrix script skeleton `scripts/duel-matrix/run-duels.ts`.
	(CLI args: `--archetypeA`, `--archetypeB`, `--runs`).

---

## Phase 2: Foundational (Blocking prerequisites)

Purpose: Core systems that MUST be implemented before any user story work begins. These
are blocking for story work.

- [X] T004 [P] Implement in-memory `TelemetryAggregator` at
	`src/telemetry/aggregator.ts`.
	(API: `startMatch(matchId)`, `record(event)`, `summary()`)
- [X] T005 [P] Implement `MatchTrace` writer at `src/telemetry/matchTrace.ts`.
	(append authoritative per-match events to `trace/<matchId>.ndjson`).
- [-] T006 [P] Add telemetry ingest API stub `POST /telemetry/event` at
	`src/server/api/telemetry.ts` matching `contracts/weapon-diversity-api.yaml`.
	(SKIPPED - no backend server).
- [-] T007 [P] Add match-start API stub `POST /match/start` at
	`src/server/api/match.ts` that triggers match initialization in the simulation
	harness. (SKIPPED - no backend server).
- [-] T008 [P] Add duel-run API stub `POST /duel/run` at
	`src/server/api/duel.ts` that forwards to the duel harness
	(`scripts/duel-matrix/run-duels.ts`). (SKIPPED - no backend server).
- [X] T009 [P] Wire test harness registration: update `tests/setup.ts` (or
	`tests/setup/*.ts`) to register the in-memory `TelemetryAggregator` and `MatchTrace`
	writer for tests.

**Checkpoint**: After T004–T009 complete, user story work may begin in parallel.

---

## Phase 3: User Story Phases (Priority order)

Note: All user stories below are Priority P1 per `spec.md`. Each story includes an
independent test and implementation tasks (models → services → endpoints/UI →
integration tests).

### Phase 3.1: User Story 1 — Watch a 10v10 automated match (P1) [US1]

Goal: Start or join a 10v10 automated match as an observer. Verify 10 red and 10 blue
robots spawn and fight autonomously.

Independent Test: `tests/integration/10v10-observer.spec.ts` should start a harness or POST
to `POST /match/start` and assert 10x10 spawn, autonomous engagement, and an eventual winner.

- [ ] T010 [US1] Implement match spawn orchestrator `src/simulation/match/matchSpawner.ts`.
	(create 10 red + 10 blue bots, configured spawn zones).
- [ ] T011 [US1] Implement match start flow connected to API stub at
	`src/simulation/match/startMatch.ts` (callable from `src/server/api/match.ts`).
- [ ] T012 [US1] Implement observer camera component `src/components/ObserverCamera.tsx`.
	(modes: free, follow, cinematic) and wire to spectator UI.
- [ ] T013 [US1] Add integration test `tests/integration/10v10-observer.spec.ts` that
	starts a match, asserts spawns, toggles camera modes, and verifies no control inputs
	reach robots.
- [ ] T014 [US1] Add lightweight spectator UI hook `src/ui/spectator/StartMatchButton.tsx`.
	(used by manual validation and smoke runs).

### Phase 3.2: User Story 2 — Observe distinct weapon behaviour & visuals (P1) [US2]

Goal: Rockets show projectile trails and AoE explosions; lasers show beams/tracers;
guns show ballistic tracers. Visuals and telemetry must be observable and deterministic
for replay.

Independent Test: `tests/weapon/visuals-smoke.spec.ts` captures a sample run demonstrating
rocket explosion VFX and laser beam/tracer alignment; telemetry events are recorded
for each observed effect.

- [X] T015 [US2] Implement `WeaponProfile` model and loader at
	`src/lib/weapons/WeaponProfile.ts` (consumes `src/lib/weapons/types.ts`).
- [X] T016 [US2] Implement projectile system entry
	`src/simulation/projectiles/ProjectileSystem.ts` (spawn/update/resolve projectiles).
- [X] T017 [US2] Implement rocket projectile and AoE resolution at
	`src/simulation/projectiles/rocket.ts` (AoE radius `2.5`, linear falloff), and emit
	per-target `weapon-damage` events sorted by `targetId`.
- [X] T018 [US2] Implement laser beam system at
	`src/simulation/weapons/laserBeam.ts` (tick damage at `tickRate=60` Hz) and emit
	per-tick `weapon-damage` with `frameIndex`.
- [X] T019 [US2] Add placeholder visuals: `src/visuals/weapons/RocketExplosion.tsx`,
	`src/visuals/weapons/LaserBeam.tsx`, `src/visuals/weapons/GunTracer.tsx` that respect
	`QualityManager` settings.
- [X] T020 [US2] Instrument telemetry hooks in
	`src/simulation/damage/damagePipeline.ts` to `record()` events: `weapon-fired`,
	`weapon-hit`, `explosion-aoe`, `weapon-damage`.
- [X] T021 [US2] Add smoke/integration tests: `tests/weapon/rocket-aoe.test.ts` and
	`tests/weapon/laser-beam.test.ts` validating deterministic ordering and timing
	(±16ms tolerance for beam alignment).

### TDD Implementation Steps — Outstanding Items (Renderer, Seeded Loadouts,
### Profile Migration, QualityManager, Pooling)

The following tasks translate the plan's outstanding items into explicit TDD-style
steps. Each item follows the red → green → refactor flow: write failing tests first,
implement minimal code to pass, then iterate and harden with integration tests.

- T030: Seeded Randomized Loadouts (`spawnSystem`) [TDD]

	- Objective: Replace deterministic weapon rotation with uniform per-robot selection
		using the global match seed (`battleWorld.state.seed`) to ensure replay determinism.
	- Files: `src/ecs/systems/spawnSystem.ts`, `tests/spawn/spawnSystem.seededLoadouts.spec.ts`
	- Tests to write first (red):
		- `should assign same weapons for same seed` — create two `BattleWorld` instances
			seeded identically and assert weapon assignments match per-robot.
		- `should produce different distributions for different seeds` — two different seeds
			produce at least one differing assignment.
		- `should only assign valid weapon ids` — all assigned weapon ids exist in
			`weaponRegistry`.
	- Implementation steps (green):
		1. Add test file and implement helpers to create a `BattleWorld` with a fixed seed
			 in tests.
		2. Run tests (observe failures).
		3. Modify `spawnTeamRobots` to build a `generator` from `battleWorld.state.seed` and
			 select weapon with `index = Math.floor(generator.next() * archetypes.length)`.
		4. Wire robot creation to use `weaponRegistry.get(id)` to set weapon-related fields
			 (fireRate, range, etc.).
		5. Run tests until they pass. Add an integration test asserting the `MatchTrace`
			 contains the same assignments when replaying the same seed.
		6. Refactor: extract a `chooseWeaponForRobot(seed, index)` helper and add
			 documentation.

- T031: Migrate Combat Profiles into `weaponRegistry` (compat adapter) [TDD]
	- Objective: Make `weaponRegistry` the single source of truth for profiles + visualRefs
		while preserving the existing `getWeaponProfile` API used across simulation code.
	- Files: `src/simulation/combat/weapons.ts` (adapter),
		`src/lib/weapons/WeaponProfile.ts`, `tests/lib/weaponAdapter.spec.ts`
	- Tests to write first (red):
		- `weaponAdapter returns same numeric fields as legacy getWeaponProfile` (parity test)
		- `weaponRegistry provides visualRefs` (renderer can access placeholder assets)
	- Implementation steps (green):
		1. Add parity tests that import both the legacy API and the new adapter and assert
			 matching fields for all archetypes.
		2. Run tests (expect failures).
		3. Implement `weaponAdapter` that reads from `weaponRegistry` and exposes
			 `getWeaponProfile(type)` signature.
		4. Update `src/simulation/combat/weapons.ts` to re-export `getWeaponProfile`
			 from the adapter (preserve consumers).
		5. Run tests and iterate until green. Remove duplicate hard-coded profile data only
			 after tests prove parity.

- [X] T032: WeaponRenderer & Visual Wiring [TDD]
	- Objective: Replace generic projectile sphere rendering with an event-driven renderer
		that creates `LaserBeam`, `RocketExplosion`, and `GunTracer` visuals based on
		simulation events/entities.
	- Files: `src/visuals/WeaponRenderer.tsx` (new), `src/components/Simulation.tsx` (modify),
		`tests/visuals/weapon-rendering.spec.tsx`
	- Tests to write first (red):
		- `should render LaserBeam when beam entity active` (simulate beam entity in
			battleWorld and assert `LaserBeam` mount)
		- `should spawn RocketExplosion on explosion event` (emit explosion event and
			assert explosion component was created)
		- `should render GunTracerWithImpact on gun hit event` (emit hit event with impact
			position)
		- `should fallback gracefully when visualRefs missing` (registry missing beamVfxRef
			should not crash renderer)
	- Implementation steps (green):
		1. Create unit tests that mount `WeaponRenderer` with a mocked event emitter
			 (provide APIs: `on('explosion', cb)`, `on('hit', cb)`, `on('beamStart', cb)`);
			 expect tests fail.
		2. Implement `WeaponRenderer` that subscribes to the provided emitter and keeps a
			 small internal state list of active visuals (beams, explosions, tracers) which
			 map to imported components.
		3. Update `SimulationContent` to instantiate an event emitter from `battleRunner`
			 or `projectileSystem` and pass it to `WeaponRenderer`.
		4. Implement minimal event emission in `projectileSystem` (if not already present)
			 for explosion/hit/beamStart/beamEnd.
		5. Run unit tests and iterate until green.
		6. Add an integration smoke test that runs the battle runner for a few frames and
			 asserts `WeaponRenderer` reacts to a fired rocket by adding an explosion node.

- [X] T033: Minimal `QualityManager` and gating [TDD]
	- Objective: Provide a runtime toggle to reduce VFX density and particle counts for
		low-quality modes.
	- Files: `src/visuals/QualityManager.ts` (new), tests in
		`tests/visuals/quality-manager.spec.ts`
	- Tests to write first (red):
		- `should reduce particle count when quality=low` (QualityManager exposes settings
			used by `WeaponRenderer`)
		- `should disable trails when feature flag off` (simulate toggling)
	- Implementation steps (green):
		1. Add unit tests that create a `QualityManager` instance and assert default
			 settings and toggled settings.
		2. Implement `QualityManager` with a small API: `getSettings()`,
			 `setProfile('high'|'medium'|'low')`, `onChange(cb)`.
		3. Make `WeaponRenderer` consult `QualityManager.getSettings()` when creating
			 particle/trail visuals.
		4. Run tests until green.

- [X] T034: VFX Pooling (explosions/tracers) [TDD]
	- Objective: Implement simple pooling to reuse visual nodes and limit GC/alloc churn
		when many effects spawn.
	- Files: `src/visuals/pools.ts`, tests in `tests/visuals/pooling.spec.ts`
	- Tests to write first (red):
		- `should reuse pooled object after release` (create pool, acquire object, release,
			then acquire again and expect same instance)
		- `should grow pool up to configured limit` (if configured)
	- Implementation steps (green):
		1. Implement tests for pool behavior.
		2. Implement a minimal generic pool: `acquire()`, `release(obj)`, `size()`; wire
			 into `WeaponRenderer` for explosion/tracer creation.
		3. Run tests until pass.

- T035: Tests — Integration & Repro (finalize)
	- Objective: Add integration tests that exercise the full path and verify determinism
		and rendering behavior.
	- Tests to add:
		- `tests/integration/weapon-rendering-repro.spec.ts` — run a seeded match, fire
			rocket/laser/gun, assert MatchTrace events and that renderer created expected
			visuals.
		- `tests/spawn/spawnSystem.seededLoadouts.integration.ts` — run two matches with
			the same seed and assert MatchTrace spawn assignments match.
	- Implementation steps:
		1. Add integration tests (prefer headless runner with small step count).
		2. Run entire test suite and fix failures until green.

These TDD-oriented steps can be executed in small commits (one failing test +
implementation per commit). Prefer feature branches for each T- item and open PRs
with test evidence.

### Phase 3.3: User Story 3 — Balance validation & rock-paper-scissors tests (P1)

Goal: Provide automated duel matrix, unit tests, and telemetry to validate RPS relations
(Laser > Gun, Gun > Rocket, Rocket > Laser) and designer-tunable multipliers.

Independent Test: `scripts/duel-matrix/run-duels.ts --archetypeA=laser --archetypeB=gun --runs=30`
produces summarized `winCounts` where advantaged archetype ≥70% wins.

- [X] T022 [US3] Implement archetype multiplier module
	`src/simulation/balance/archetypeMultiplier.ts` (API: `getArchetypeMultiplier(attacker,
	defender)` returning `1.25|0.85|1.0`).
- [X] T023 [US3] Integrate archetype multiplier into damage pipeline
	`src/simulation/damage/damagePipeline.ts` ensuring `finalDamage = baseDamage *
	archetypeMultiplier * otherModifiers` before resistances.
- [X] T024 [US3] Implement/complete duel harness logic in
	`scripts/duel-matrix/run-duels.ts` (run N duels, seedable RNG, aggregate results via
	`TelemetryAggregator`).
- [ ] T025 [US3] Add duel matrix API wiring `src/server/api/duel.ts` to call the duel
	harness and return `winCounts` / `damageTotals` as defined in
	`contracts/weapon-diversity-api.yaml` (SKIPPED - no API server).
- [X] T026 [US3] Add automated duel tests `tests/duel/duel-matrix.spec.ts` that run
	harness headlessly (or call API) and assert advantaged weapon wins ≥70%
	(configurable sample size).

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Update `specs/005-weapon-diversity/quickstart.md` with exact run commands
	and troubleshooting notes for the feature.
- [ ] T028 [P] Add CI / package.json script `scripts` entries: `duel-matrix`, `run-10v10`,
	and `telemetry-smoke` and document them in `package.json`.
- [ ] T029 [P] Performance & quality-scaling tests: add `tests/perf/vfx-quality.spec.ts`
	and scripts to sweep `QualityManager` presets and assert simulation invariance.
- [ ] T030 [P] Documentation & PR: write `specs/005-weapon-diversity/README.md`
	summarizing acceptance criteria, quickstart commands, and decision log links.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (Setup must be complete before Foundational completes where
	indicated)
- Foundational (Phase 2: T004–T009) BLOCKS all User Story phases (T010+)
- After Phase 2 completes, User Stories (US1, US2, US3) can be implemented in
	parallel by different engineers, subject to file ownership and collisions.

### Story Dependencies (high level)
- US1 (10v10) depends on: T004, T005, T006, T007, T009
- US2 (Visuals & mechanics) depends on: T001, T004, T005, T016
- US3 (Balance + duel harness) depends on: T001, T004, T005, T003

---

## Parallel Execution Examples

- Foundation: `T004`, `T005`, `T006`, `T007`, `T008`, `T009` can be worked on in
	parallel by separate engineers.
- US2 parallel: `T017` (rocket) and `T018` (laser) and `T019` (visuals) are
	independent and can be implemented in parallel once weapon types exist.
- US3 parallel: writing `T022` (multiplier) and `T023` (damage pipeline integration)
	can be split: one engineer implements `T022`, another updates pipeline `T023`
	after API is stable.

---

## Independent Test Criteria (per story)

- **US1**: `tests/integration/10v10-observer.spec.ts` — Start match, assert 10 red + 10
	blue spawn, verify observer cannot control robots, toggle camera modes.
- **US2**: `tests/weapon/rocket-aoe.test.ts`, `tests/weapon/laser-beam.test.ts` — Rocket
	AoE emits `explosion-aoe` and `weapon-damage` events with deterministic ordering;
	Laser beam emits per-tick `weapon-damage` and visuals align within ±16ms.
- **US3**: `tests/duel/duel-matrix.spec.ts` — For each pairing (laser/gun, gun/rocket,
	rocket/laser) run ≥30 duels and assert advantaged archetype ≥70% win rate.

---

## Implementation Strategy

- MVP First: Complete Phase 1 + Phase 2 → Implement US1 (10v10 observer) → VALIDATE
	(smoke integration test). If green, deliver MVP demo.
- Incremental: After MVP, implement US2 (mechanics & visuals) and US3 (balance harness)
	in parallel as resources permit. Prefer small, testable commits (<300 LOC) and add
	unit tests first where practical.
- Tests: Where acceptance requires numerical thresholds (duel matrix), write tests
	that run headlessly and return clear JSON summaries to enable CI gating.

---

## File To Be Created

- `specs/005-weapon-diversity/tasks.md` (this file)

---

End of generated tasks for Weapon Diversity (005).

```