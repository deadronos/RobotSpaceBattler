# Tasks: Simulation deterministic fixed-step overhaul

**Input**: Design documents from `/specs/001-title-simulation-spec/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```text
1. Confirm branch `001-title-simulation-spec` is synced; install deps with `npm install` if needed.
2. Load plan.md for tech stack, StepContext requirements, and constitution gates.
3. Review research.md, data-model.md, contracts/, and quickstart.md to extract entities, contracts,
   and deterministic constraints.
4. Execute Phase 3.1–3.5 tasks in order, keeping TDD discipline: harness → failing tests → core
   implementation → integrations → polish.
5. Maintain constitution compliance (Physics-First, Deterministic Simulation, TDD, Small Systems,
   ECS-driven, On-Demand Rendering) during every task.
6. After each phase, run `npm run lint`, `npm run test`, and targeted Playwright smoke tests to
   validate determinism and regressions.
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- Single frontend project: `src/` and `tests/` at repo root
- ECS components under `src/ecs/`, systems under `src/systems/`
- Contracts live in `specs/001-title-simulation-spec/contracts/`

## Phase 3.1: Setup

- [ ] T001 Create deterministic fixed-step harness helpers in `tests/helpers/fixedStepHarness.ts` to
      centralize StepContext/`FixedStepDriver` builders (seeded RNG, `simNowMs` utilities).
- [ ] T002 Update `tests/tsconfig.json` and `tests/setup.ts` to register the new helpers and ensure
      Vitest loads `tests/contracts/*` with the shared harness.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**Write these tests first and watch them fail before touching implementation.**

- [ ] T003 [P] Author failing ScoringSystem contract test in
      `tests/contracts/scoringSystem.contract.test.ts` verifying classification, score deltas, and
      runtime event log ordering.
- [ ] T004 [P] Author failing RespawnSystem contract test in
      `tests/contracts/respawnSystem.contract.test.ts` covering respawn delay, queue behavior, and
      invulnerability timestamps.
- [ ] T005 [P] Author failing runtime event log contract test in
      `tests/contracts/runtimeEventLog.contract.test.ts` validating ring buffer capacity, ordering,
      and deterministic IDs.
- [ ] T006 [P] Add seeded deterministic integration test in
      `tests/integration/simulationDeterminism.test.ts` verifying identical StepContext traces across
      repeated runs using `FixedStepDriver`.
- [ ] T007 [P] Add respawn queue integration test in
      `tests/integration/respawnQueueDeterminism.test.ts` ensuring Simulation passes
      `StepContext.simNowMs` into RespawnSystem and enforces queue limits.
- [ ] T008 [P] Add friendly-fire toggle integration test in
      `tests/integration/friendlyFireToggle.test.ts` confirming Simulation injects the toggle into
      ProjectileSystem/BeamSystem via StepContext (no direct `useUI` reads).
- [ ] T032 PhysicsSync — TDD (test): create failing integration test in
      `tests/integration/physicsSync.contract.test.ts` verifying Rapier RigidBody
      translations are copied into ECS `position` components and that systems do not
      mutate Three.js mesh transforms when a RigidBody is present.
- [ ] T033 Deterministic Physics Adapter — TDD (test): author contract tests in
      `tests/contracts/physicsAdapter.contract.test.ts` asserting parity between a
      `rapierAdapter` and a `deterministicAdapter` for canonical operations (raycast,
      overlap, proximity checks).
- [ ] T034 WeaponSystem — TDD (test): add failing contract/unit tests in
      `tests/contracts/weaponSystem.contract.test.ts` to validate weapon cooldowns,
      `WeaponFiredEvent` emission semantics, and deterministic firing behavior using
      `FixedStepDriver`.
- [ ] T035 HitscanSystem — TDD (test): add failing contract tests in
      `tests/contracts/hitscanSystem.contract.test.ts` to verify authoritative
      Rapier raycast resolution and deterministic fallback behavior when the
      physics adapter is substituted.
- [ ] T036 Pause/Resume determinism — TDD (test): create tests in
      `tests/pause/pauseResume.test.ts` that assert pause captures velocities using
      `src/ecs/pauseManager.ts`, suspends the `FixedStepDriver`, and restores
      velocities deterministically on resume.
- [ ] T037 Team & ID normalization — TDD (test): add unit tests in
      `tests/unit/idAndTeamTypes.test.ts` asserting canonical types (string-based
      gameplay IDs and unified `Team` enum).
- [ ] T038 Spawn placement & proximity heuristic — TDD (test): author an
      integration test `tests/integration/spawnPlacement.test.ts` validating spawn
      queue behavior, a minimum distance threshold from enemies, and
      deterministic placement using StepContext.rng.

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [ ] T009 [P] Create `src/ecs/components/robot.ts` defining deterministic Robot entity schema
      (id, team, health, weapon state, `invulnerableUntil`) per data-model and export helpers.
- [ ] T010 [P] Create `src/ecs/components/projectile.ts` defining deterministic Projectile component
      (ownerId, team, position, velocity, spawn time, lifespan, aoeRadius, damage).
- [ ] T011 [P] Create `src/ecs/components/beam.ts` defining deterministic Beam component (origin,
      direction, ticks remaining, tick interval, damage per tick).
- [ ] T012 [P] Implement `src/utils/runtimeEventLog.ts` providing `DeathAuditEntry` types and a
      bounded ring buffer API (append/read/size/capacity) per observability contract.
- [ ] T013 Refactor `src/ecs/miniplexStore.ts` to consume the new component modules, ensure
      deterministic id assignment, and expose helpers for `invulnerableUntil` tracking.
- [ ] T014 Align `src/ecs/weapons.ts` with deterministic team/owner id types and remove implicit
      enums in preparation for StepContext-provided flags.
- [ ] T015 Extend `src/utils/seededRng.ts` with deterministic sequence helpers (idFactory, shuffle)
      consumed by StepContext.
- [ ] T016 Upgrade `src/utils/fixedStepDriver.ts` to emit full StepContext (frameCount, simNowMs,
      rng, idFactory) and support deterministic step accumulation.
- [ ] T017 Update `src/hooks/useFixedStepLoop.ts` to accumulate elapsed time, cap steps-per-frame,
      and expose StepContext-compatible driver hooks.
- [ ] T018 Inject StepContext and test-mode entrypoint into `src/components/Simulation.tsx`, ensuring
      systems receive `simNowMs`, seeded rng, and friendly-fire flags.
- [ ] T019 Refactor `src/systems/ScoringSystem.ts` to consume StepContext, classify kills
      deterministically, and append `DeathAuditEntry` objects via the runtime event log.
- [ ] T020 Refactor `src/systems/RespawnSystem.ts` to require `StepContext.simNowMs`, enforce spawn
      queue rate limiting, and set `invulnerableUntil` deadlines.
- [ ] T021 Update `src/systems/ProjectileSystem.ts` to use StepContext RNG and friendly-fire flag
      instead of `useUI` state, ensuring deterministic spread.
- [ ] T022 Update `src/systems/BeamSystem.ts` to drive tick scheduling via StepContext and eliminate
      `Date.now()` usage.
- [ ] T023 Update `src/systems/FxSystem.ts` to consume deterministic events (StepContext frame ids)
      and avoid non-deterministic timers.
- [ ] T024 Ensure `src/systems/DamageSystem.ts` applies damage ordering deterministically using
      StepContext frameCount (remove implicit array mutation ordering).
- [ ] T025 Expose runtime event log accessors through `src/ecs/ecsResolve.ts` (or a new
      observability service) for Simulation and diagnostics consumers.
- [ ] T026 Render runtime event log entries in `src/components/DiagnosticsOverlay.tsx` to aid
      debugging and QA validation.
- [ ] T027 Update `src/store/uiStore.ts` and `src/components/Simulation.tsx` wiring so
      friendly-fire toggle flows through StepContext without systems touching the store directly.
- [ ] T028 Add fixed-step performance metrics emission to `src/utils/sceneMetrics.ts` (or
      DiagnosticsOverlay) highlighting steps-per-frame and backlog for QA.

## Phase 3.5: Polish

- [ ] T029 [P] Add targeted unit coverage for runtime event log edge cases in
      `tests/unit/runtimeEventLog.test.ts` (overflow, order toggles, reset).
- [ ] T030 [P] Extend `tests/performance.benchmark.test.ts` with a 500-entity seeded benchmark
      verifying <16ms per fixed-step using the upgraded driver.
- [ ] T031 [P] Update `specs/001-title-simulation-spec/quickstart.md` and `docs/DEPENDENCIES.md`
      with StepContext harness instructions and observability notes.

## Dependencies

- T001 → T002 → (T003–T008): harness and config before any tests.
- Tests T003–T008 MUST precede implementation tasks T009 onward (TDD requirement).
- T009–T012 (entity definitions/event log) must complete before T013 and all system refactors that
  consume them.
- T015 precedes T016, which unlocks T017–T018; Simulation wiring (T018) unlocks system refactors
  T019–T024.
- T019 and T020 must land before exposing/visualizing the event log (T025–T026).
- Friendly-fire wiring (T027) depends on T018 and system updates T021–T022.
- Performance metrics (T028) depends on fixed-step upgrades (T016–T018).
- Polish tasks (T029–T031) run only after all core and integration tasks are complete.
- Physics and position authority:
  - T032 (PhysicsSync) MUST complete before any systems that depend on authoritative
    Rapier transforms run their refactors: add explicit dependency lines so
    T032 precedes T019, T021, T022, T024 (ScoringSystem, ProjectileSystem,
    BeamSystem, DamageSystem).
- Physics adapter ordering:
  - T033 (Deterministic Physics Adapter) MUST precede refactors of systems that
    perform raycasts or overlap queries. Add dependency so T033 precedes T035
    (HitscanSystem) and T021 (ProjectileSystem) where physics queries are used.
- Weapon/Hitscan/Damage ordering:
  - T034 and T035 (Weapon/Hitscan tests) should run before T024 (DamageSystem)
    and T019 (ScoringSystem) to ensure upstream events are deterministic and
    correctly emitted.
- Pause and driver:
  - T036 must run early (before heavy integration) so `FixedStepDriver` and
    `pauseManager` semantics are validated; recommend T036 precede T016–T018
    (driver and Simulation wiring) when practical.
- Type normalization:
  - T037 should precede component creation/refactors T009–T013 to avoid type
    mismatches during implementation.
- Spawn placement:
  - T038 should precede T020 (RespawnSystem) so proximity logic is available to
    the respawn queue implementation.

## Parallel Execution Example
```text
# After completing T002 and before starting implementation, run contract + integration tests in parallel:
tasks run T003
.tasks run T004
.tasks run T005
.tasks run T006
.tasks run T007
.tasks run T008

# Later, once test suite is green, model tasks may run together:
tasks run T009
.tasks run T010
.tasks run T011
.tasks run T012
```

## Notes

- Keep every system under 300 lines and prefer pure functions that accept StepContext explicitly.
- Rapier rigid bodies remain authoritative; never mutate mesh transforms inside systems.
- Use seeded RNG helpers exclusively for randomness; avoid `Math.random()` and `Date.now()` in
  simulation code.
- Commit after each task; rerun `npm run lint` and `npm run test` frequently to validate
  determinism.
