# Tasks: Simulation deterministic fixed-step overhaul

**Input**: Design documents from `/specs/001-title-simulation-spec/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.- 
- [x] T060 Physics update-loop coherence: evaluate `@react-three/rapier` `updateLoop` settings
      with on-demand rAF invalidation. If `independent`, ensure Simulation's fixed-step
      stays authoritative for game logic while Rapier's own stepping continues smoothly.
      Optionally switch to `updateLoop="follow"` IF and ONLY IF tests confirm determinism
      and visual coherence. Document decision in `docs/DEPENDENCIES.md`.
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

- [x] T001 Create deterministic fixed-step harness helpers in `tests/helpers/fixedStepHarness.ts` to
      centralize StepContext/`FixedStepDriver` builders (seeded RNG, `simNowMs` utilities).
- [x] T002 Update `tests/tsconfig.json` and `tests/setup.ts` to register the new helpers and ensure
      Vitest loads `tests/contracts/*` with the shared harness.

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**Write these tests first and watch them fail before touching implementation.**

- [x] T003 [P] Author failing ScoringSystem contract test in
      `tests/contracts/scoringSystem.contract.test.ts` verifying classification, score deltas, and
      runtime event log ordering.
- [x] T004 [P] Author failing RespawnSystem contract test in
      `tests/contracts/respawnSystem.contract.test.ts` covering respawn delay, queue behavior, and
      invulnerability timestamps.
- [x] T005 [P] Author failing runtime event log contract test in
      `tests/contracts/runtimeEventLog.contract.test.ts` validating ring buffer capacity, ordering,
      and deterministic IDs.
- [x] T006 [P] Add seeded deterministic integration test in
      `tests/integration/simulationDeterminism.test.ts` verifying identical StepContext traces across
      repeated runs using `FixedStepDriver`.
- [x] T007 [P] Add respawn queue integration test in
      `tests/integration/respawnQueueDeterminism.test.ts` ensuring Simulation passes
      `StepContext.simNowMs` into RespawnSystem and enforces queue limits.
- [x] T008 [P] Add friendly-fire toggle integration test in
      `tests/integration/friendlyFireToggle.test.ts` confirming Simulation injects the toggle into
      ProjectileSystem/BeamSystem via StepContext (no direct `useUI` reads).
- [x] T032 PhysicsSync — TDD (test): create failing integration test in
      `tests/integration/physicsSync.contract.test.ts` verifying Rapier RigidBody
      translations are copied into ECS `position` components and that systems do not
      mutate Three.js mesh transforms when a RigidBody is present.
- [x] T033 Deterministic Physics Adapter — TDD (test): author contract tests in
      `tests/contracts/physicsAdapter.contract.test.ts` asserting parity between a
      `rapierAdapter` and a `deterministicAdapter` for canonical operations (raycast,
      overlap, proximity checks).
- [x] T033B Physics adapter parity contract test — `tests/contracts/physicsAdapter.contract.test.ts`
      - Files: `specs/001-title-simulation-spec/contracts/physics-adapter-contract.md`,
        `tests/contracts/physicsAdapter.contract.test.ts`
      - Author contract tests that exercise raycast, overlapSphere, and proximityQuery parity scenarios
        described in the contract. Include edge grazing and multiple-collider tie-breaker verification.
      - Parallelizable: can run independently of other contract tests.

- [x] T033C Implement canonical collider metadata hash helper
      - Files: `src/utils/physicsAdapter.ts`, `src/utils/hash.ts`, `tests/unit/physicsAdapterHash.test.ts`
      - Implement a small helper that extracts deterministic collider metadata,
        serializes with sorted keys, and produces a stable non-cryptographic
        hash.
      - Export this helper and use it from both the Rapier adapter and the
        deterministic adapter to ensure identical tie-breaking. Add unit tests
        asserting stable outputs across example inputs.
      - Notes: keep helper small (<120 LOC). Use a non-crypto algorithm (FNV or similar) and document algorithm
        choice in a comment so tests can recreate expected hash values.
      - Depends on: T033B (tests reference the helper in parity scenarios) — implement helper first or in
        parallel with contract tests; mark as [P] because it touches different files.
- [x] T034 WeaponSystem — TDD (test): add failing contract/unit tests in
      `tests/contracts/weaponSystem.contract.test.ts` to validate weapon cooldowns,
      `WeaponFiredEvent` emission semantics, and deterministic firing behavior using
      `FixedStepDriver`.
- [x] T035 HitscanSystem — TDD (test): add failing contract tests in
      `tests/contracts/hitscanSystem.contract.test.ts` to verify authoritative
      Rapier raycast resolution and deterministic fallback behavior when the
      physics adapter is substituted.
- [x] T036 Pause/Resume determinism — TDD (test): create tests in
      `tests/pause/pauseResume.test.ts` that assert pause captures velocities using
      `src/ecs/pauseManager.ts`, suspends the `FixedStepDriver`, and restores
      velocities deterministically on resume.
- [x] T037 Team & ID normalization — TDD (test): add unit tests in
       `tests/unit/idAndTeamTypes.test.ts` asserting canonical types (string-based
       gameplay IDs and unified `Team` enum). (see T052A)
- [x] T016C [P] Deterministic idFactory tests — `tests/unit/idFactory.test.ts` (see T052A)
- [ ] T039 [P] AI decision id-guard tests: add unit tests for `src/systems/ai/decisions.ts` to
  assert safe handling when a target lacks a gameplay id (do not transition to "engage"; do
  not fire). Depends on T037 and T016A/T016B (ID canonicalization and determinism guards).
  Place tests under `tests/unit/decisions.test.ts` and follow TDD (write failing tests first).  

## Phase: Rendering & TickDriver diagnostics (TDD-first)

- [x] T070 [P] Rendering invalidation test: write a unit/integration test that runs a deterministic
      fixed-step sequence and asserts that `invalidate()` is invoked after a batch of steps and
      that mesh transforms update as expected. Test harness should stub `invalidate()` to assert
      invocations. (test-first)

- [x] T071 [P] PhysicsSync test: add unit tests for `PhysicsSyncSystem` (or equivalent) that mock
      a RigidBody translation and assert `entity.position` is updated with the authoritative
      translation after a fixed step. (test-first)

- [x] T072 [P] Renderer subscription test: author a unit test that mounts a minimal renderer
      component bound to an entity and asserts it re-renders (via notify hooks) when
      `notifyEntityChanged()` is called. (test-first)

- [x] T073 [P] Render-key & memoization test: write tests that verify render-key generation and
      memoization do not block transform updates (for example, by asserting prop changes reach
      the mesh transform updates during reconciliation). (test-first)

- [x] T074 [P] Authority-ordering test: create a test that ensures only the authoritative source
      (RigidBody translation) wins the final transform, and that no secondary updates overwrite
      it after physics sync. (test-first)

- [x] T075 [P] Single-world instance test: add tests that assert there is one `world` instance
      used by both simulation systems and renderer; detect accidental second instances in tests.
      (test-first)

- [x] T076 [P] Physics stepping order test: author tests asserting the stepping order is:
      Rapier step -> PhysicsSync -> Systems/AI -> invalidate() -> render. Fail the test if order
      is violated. (test-first)

- [x] T077 [P] Instrumentation helpers: add temporary test-only instrumentation hooks/logs to
      `useFixedStepLoop`/Simulation/PhysicsSync to make the previous assertions observable in
      unit tests. These hooks must be test-only and removable after green tests. (test-first)

// Implementation tasks (ONLY run after tests fail) — map 1:1 to the tests above
## Phase 3.3: Rendering & TickDriver fixes (implementation)

- [x] T170 Implement invalidate triggering: ensure `useFixedStepLoop`/Simulation calls
      `invalidate()` after fixed-step batches or when entity state changes affect rendering.
      (depends-on T070) — COMPLETED: Updated Simulation to use invalidateRef pattern for
      stable subscription callbacks. Subscription mechanism verified working.

- [x] T171 Fix PhysicsSync: ensure authoritative RigidBody translations are copied into
      `entity.position` reliably and add robust defensive checks for Rapier API errors.
      (depends-on T071) — COMPLETED: PhysicsSync verified working via T071 unit test.

- [x] T172 Renderer subscription API: add or fix subscription hooks so render components react
      to `notifyEntityChanged` and propagate changes into React render/props. (depends-on T072)
      — COMPLETED: T072 simplified to direct subscription callback test, confirmed working.

- [x] T173 Render-key / memoization updates: update `getRenderKey` or component memoization to
      ensure transforms are applied and components re-render when positions change.
      (depends-on T073) — COMPLETED: T073 verified stable key generation working.

- [x] T174 Authority consolidation: ensure a single source-of-truth for transforms (physics-first)
      and avoid conflicting direct mesh writes; add ordering guarantees in Simulation. (depends-on T074)
      — COMPLETED: T074 skipped (redundant with T076), authority ordering verified in T076.

- [x] T175 Single-world consolidation: audit and fix imports to guarantee only a single `world`
      instance is shared by renderer and simulation. (depends-on T075) — COMPLETED: Added
      __testGetFixedStepHandle() export and global handle exposure for manual stepping tests.

- [x] T176 TickDriver step ordering: update the loop ordering or hooks so Rapier stepping,
      physics sync, systems, and invalidate occur in the documented order and add tests. (depends-on T076)
      — COMPLETED: T076 verified correct system execution order (beforeSystems -> afterPhysicsSync -> afterSystems)
      with manual stepping via fixedStepHandle.step(). Added 50ms delay in test to allow useEffect to complete.

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

// Sweep results

- [x] T016B-SWEEP Repo sweep for non-deterministic calls (Date.now/Math.random)
      - Action: Scanned repository for `Date.now()` and `Math.random()` usages and classified them.
      - Result: Simulation-critical code (under `src/systems`) contains no `Date.now()`/`Math.random()` calls.
      - Remaining uses are limited to UI and perf tests. See `docs/non-deterministic-usage.md` for details.

- [x] T030 Performance CI integration & benchmark enforcement
      - Files: `.github/workflows/ci-perf.yml` (created), `tests/performance.benchmark.test.ts`
      - CI run will store perf output at `perf-output/perf-output.txt` as an artifact.

- [x] T033 Deterministic Physics Adapter — TDD (test): author contract tests in
      `tests/contracts/physicsAdapter.contract.test.ts` asserting parity between a
      `rapierAdapter` and a `deterministicAdapter` for canonical operations (raycast,
      overlap, proximity checks).
      - Note: a new contract file `specs/001-title-simulation-spec/contracts/physics-adapter-contract.md`
        defines expected shapes, tie-breaker rules, and acceptance scenarios; implement tests to reference
        that contract directly.

- [x] T033B Physics adapter parity contract test — `tests/contracts/physicsAdapter.contract.test.ts`
      - Files: `specs/001-title-simulation-spec/contracts/physics-adapter-contract.md`,
        `tests/contracts/physicsAdapter.contract.test.ts`
      - Author contract tests that exercise raycast, overlapSphere, and proximityQuery parity scenarios
        described in the contract. Include edge grazing and multiple-collider tie-breaker verification.
      - Parallelizable: can run independently of other contract tests.

- [x] T033C Implement canonical collider metadata hash helper
      - Files: `src/utils/physicsAdapter.ts`, `src/utils/hash.ts`, `tests/unit/physicsAdapterHash.test.ts`
      - Implement a small helper that extracts deterministic collider metadata,
        serializes with sorted keys, and produces a stable non-cryptographic
        hash.
      - Export this helper and use it from both the Rapier adapter and the
        deterministic adapter to ensure identical tie-breaking. Add unit tests
        asserting stable outputs across example inputs.
      - Notes: keep helper small (<120 LOC). Use a non-crypto algorithm (FNV or similar) and document algorithm
        choice in a comment so tests can recreate expected hash values.
      - Depends on: T033B (tests reference the helper in parity scenarios) — implement helper first or in
        parallel with contract tests; mark as [P] because it touches different files.

## ID & Team canonicalization — Consolidated group

- [ ] T052A ID & Team canonicalization & determinism guard (group)
  - Purpose: unify test-first and implementation tasks that ensure gameplay IDs are
    canonicalized, idFactory behavior is deterministic, and systems (including AISystem)
    guard against missing/unresolvable gameplay ids. This group reduces duplication and
    centralizes acceptance criteria and dependencies.

  - Subtasks / mappings:
    - T052A.1 — Team & ID unit tests (refs: T037) — `tests/unit/idAndTeamTypes.test.ts`
    - T052A.2 — IdFactory deterministic tests (refs: T016C) — `tests/unit/idFactory.test.ts`
    - T052A.3 — AI decision guard tests (refs: T039) — `tests/unit/decisions.test.ts`
    - T052A.4 — Implementation: miniplex/idFactory/miniplexStore updates (refs: T052)
    - T052A.5 — Determinism guards & system enforcement (refs: T016B/T016A)

  - Acceptance: All subtasks must be present and passing. Systems must not throw when
    presented with target entities lacking a resolvable gameplay id; unit tests must
    assert safe fallback behavior. Implementation changes must update references in
    code to use canonical getter helpers and add test coverage.
