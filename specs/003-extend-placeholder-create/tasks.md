# Tasks: 3D Team Fight — extend-placeholder-create

**Feature**: Extend 001 & 002 — 3D Team Fight Match with Graphics Integration  
**Branch**: `003-extend-placeholder-create`  
**Generated**: 2025-10-18  
**Updated**: 2025-10-19  
**Total Tasks**: 66 | **Phases**: 8

---

## Phase 1: Setup & Foundation

Initialize project structure, dependencies, and build tooling.

- [x] T001 Set up feature branches and directory structure
- [x] T002 Verify Vitest, ajv, TypeScript in `package.json`, `tsconfig.json`
- [x] T003 Create documentation placeholders in `specs/003-extend-placeholder-create/`

---

## Phase 2: Contract Validation Foundation

Implement contract validator infrastructure (blocks all user stories).

- [x] T004 [P] Create `specs/003-extend-placeholder-create/schemas/team.schema.json`
- [x] T005 [P] Create `specs/003-extend-placeholder-create/schemas/matchtrace.schema.json`
- [x] T006 Create `tests/contract-validator.spec.ts` test harness using Vitest + ajv
- [x] T007 [P] Create `src/systems/matchTrace/contractValidator.ts` wrapper
- [x] T008 Implement `src/systems/matchTrace/types.ts` TypeScript interfaces
- [x] T009 Add contract validation tests for FR-009-A acceptance criteria
- [x] T010 Run contract validator tests and confirm all pass

---

## Phase 3: User Story 1 — Run a 3D Team Fight Match (P1)

**Story Goal**: Execute fully automated 3D match from spawn to victory.

**Independent Test Criteria**:

- Complete match runs spawn to victory in dev scene
- Two teams spawn with 3D models and move correctly
- Projectiles fire and collisions are visible
- Winning team identified by simulation
- Match result recorded in-memory
- Visual rendering completes without crash

**Implementation Strategy**: Build synchronization and rendering loop first; then entity
spawn/despawn; then projectiles; finally victory detection and HUD.

### Task Group 3.1: Match Timeline & Synchronization

- [x] T011 [P] [US1] Create `src/systems/matchTrace/matchPlayer.ts`
- [x] T012 [P] [US1] Implement `src/systems/matchTrace/interpolator.ts`
- [x] T013 [US1] Add frame-step debug mode to `matchPlayer.ts`
- [x] T014 [P] [US1] Create `src/hooks/useMatchTimeline.ts` hook

### Task Group 3.2: Entity Spawning & Visual Representation

- [x] T015 [P] [US1] Create `src/systems/matchTrace/entityMapper.ts`
- [x] T016 [P] [US1] Implement `src/components/match/RenderedRobot.tsx`
- [x] T017 [US1] Create `src/components/match/RenderedProjectile.tsx`
- [x] T018 [P] [US1] Extend `src/components/match/MatchPlayer.tsx`
- [x] T019 [US1] Implement asset fallback in `src/systems/matchTrace/assetLoader.ts`

### Task Group 3.3: Victory & Match End State

- [x] T020 [P] [US1] Create `src/systems/matchTrace/matchValidator.ts`
- [x] T021 [US1] Implement `src/components/match/MatchHUD.tsx`
- [x] T022 [US1] Implement `src/components/match/MatchCinematic.tsx` stub

### Task Group 3.4: Integration & Match Execution

- [x] T023 [P] [US1] Create `src/hooks/useMatchSimulation.ts` orchestrator
- [x] T024 [US1] Integrate components into `src/components/Scene.tsx`
- [x] T025 [US1] Write tests in `tests/unit/matchPlayer.test.ts`
- [x] T026 [US1] Write tests in `tests/unit/entityMapper.test.ts`

---

## Phase 4: User Story 2 — Visual Quality & Graphics Options (P2)

**Story Goal**: Toggle visual quality settings (High/Medium/Low) without simulation impact.

**Independent Test Criteria**:

- Visual quality profile can be set before/during match
- High mode shows enhanced effects (shadows, textures, particles)
- Low/Performance mode uses simplified materials
- Simulation outcome identical across profiles
- Frame rate adapts without breaking rendering

### Task Group 4.1: Quality Profile Definition

- [x] T027 [P] [US2] Create `src/systems/matchTrace/visualQualityProfile.ts`
- [x] T028 [US2] Implement `src/hooks/useVisualQuality.ts` hook
- [x] T029 [P] [US2] Create `src/components/match/QualityToggle.tsx`

### Task Group 4.2: Rendering Integration

- [x] T030 [P] [US2] Extend `RenderedRobot.tsx` with quality parameters
- [x] T031 [P] [US2] Extend `RenderedProjectile.tsx` with quality parameters
- [x] T032 [US2] Update `matchPlayer.ts` to pass quality profile

### Task Group 4.3: Testing

- [x] T033 [US2] Write tests in `tests/unit/visualQualityProfile.test.ts`
- [x] T034 [P] [US2] Write E2E test in `playwright/tests/quality-toggle.spec.ts`

---

## Phase 5: User Story 3 — Deterministic Replay & Simulation Sync (P2)

**Story Goal**: Record and replay MatchTrace deterministically.

**Independent Test Criteria**:

- MatchTrace recorded with RNG seed and timestamps
- Replay reconstructs entity state from trace
- Entity positions match within ±16ms tolerance
- Hit/damage events occur at correct timestamps
- Replay yields same winner as original

### Task Group 5.1: RNG & Replay Infrastructure

- [x] T035 [P] [US3] Implement `src/systems/matchTrace/rngManager.ts`
- [x] T036 [US3] Extend `matchPlayer.ts` for replay mode with RNG seed
- [x] T037 [P] [US3] Implement `src/hooks/useMatchReplay.ts` hook
- [x] T038 [US3] Create `src/components/match/ReplayControls.tsx`

### Task Group 5.2: Replay Integration

- [x] T039 [P] [US3] Add replay mode toggle to `useMatchSimulation.ts`
- [x] T040 [US3] Write tests in `tests/unit/matchReplay.test.ts`
- [x] T041 [US3] Write tests in `tests/unit/eventTiming.test.ts`
- [x] T042 [P] [US3] Write E2E test in `playwright/tests/deterministic-replay.spec.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

Final integration, debugging, and optimization (optional for MVP).

- [x] T043 [P] Implement post-victory cinematic camera sweep
- [x] T044 Implement debug logging in `src/systems/matchTrace/debug.ts`
- [x] T045 [P] Add performance hooks in `src/hooks/usePerformanceMetrics.ts`
- [x] T046 Run full test suite: `npm run test` + `npm run playwright:test`
- [x] T047 Run linter: `npm run lint` and fix issues
- [x] T048 Generate coverage: `npm run test:coverage` and verify coverage
- [x] T049 Document implementation in `specs/003-extend-placeholder-create/implementation-notes.md`

---

## Phase 7: Live Match Playback & Real-Time Rendering (P2)

**Story Goal**: Render simulated matches in real-time by capturing events into a live trace
and displaying them as they happen. Unifies live and replay paths into a single
trace-driven architecture.

**Independent Test Criteria**:

- Live simulation renders 3D match as events occur
- Entities move, fire, take damage in real-time
- Victory overlay displays when match ends
- Same trace can be replayed deterministically
- Quality settings don't affect simulation outcome
- All 367 existing tests still pass

**Implementation Strategy**: Create live trace capture hook → wire to renderer → add UI
controls → create between-rounds flow.

### Task Group 7.1: Live Trace Capture Infrastructure

- [x] T050 [P] Create `src/hooks/useLiveMatchTrace.ts` hook
  - [x] Capture spawn events from entity creation
  - [x] Capture move events from position deltas
  - [x] Capture fire events from projectile creation
  - [x] Capture damage events from health changes
  - [x] Capture death events from entity elimination
  - [x] Assign sequenceId for deterministic tie-breaking
  - [x] Track RNG seed and algorithm metadata
  - [x] Return growing MatchTrace object

### Task Group 7.2: Wire Live Trace to Renderer

- [x] T051 [P] Wire live trace to `src/components/Scene.tsx`
  - [x] Import `useLiveMatchTrace` hook
  - [x] Call hook in Simulation component
  - [x] Pass live trace to MatchSceneInner
  - [x] Remove static RobotPlaceholder components
  - [x] Verify entities render dynamically
  - [x] Verify HUD shows entity count and progress
  - [x] Test match renders from spawn to victory

### Task Group 7.3: Quality Toggle & Visual Controls

- [x] T052 [P] Add quality toggle to UI
  - [x] Create button in `src/components/hud/ControlStrip.tsx`
  - [x] Extend UI store for quality selector
  - [x] Update `useVisualQuality` hook
  - [x] Toggle High/Medium/Low quality on button click
  - [x] Verify visual changes without affecting trace
  - [x] Verify outcome identical across profiles
  - [x] Test quality toggle during active match

### Task Group 7.4: Between-Rounds UI & Match Flow

- [x] T053 [P] Create `src/components/match/BetweenRoundsUI.tsx`
  - [x] Display match result summary (winner, team stats)
  - [x] Show kill/damage breakdown by entity
  - [x] Implement "Rematch" button (new RNG seed)
  - [x] Implement "Team Selection" screen
  - [x] Add "Export Trace" button (save as JSON)
  - [x] Wire victory callback to UI display
  - [x] Test rematch flow end-to-end

### Task Group 7.5: Integration & Validation

- [x] T054 [US3] Write tests in `tests/unit/liveTrace.test.ts`
  - [x] Test spawn event capture
  - [x] Test move event capture
  - [x] Test fire event capture
  - [x] Test damage event capture
  - [x] Test death event capture
  - [x] Test sequenceId ordering
  - [x] Test RNG metadata recording

- [x] T055 [US3] Write E2E test in `playwright/tests/live-match-rendering.spec.ts`
  - [x] Start app and see match rendering
  - [x] Verify robots move and fire
  - [x] Verify damage indicators
  - [x] Verify victory overlay
  - [x] Test quality toggle during match
  - [x] Test rematch flow

- [x] T056 [P] Verify no regression in existing tests
  - [x] Run full test suite: `npm run test`
  - [x] Verify 406/407 tests passing (1 skipped)
  - [x] Run linter: `npm run lint`
  - [x] Verify 0 ESLint errors (deprecation warning only)
  - [x] Run coverage: `npm run test:coverage` (60.21% statements)
  - [x] Verify coverage maintained or improved

---

## Phase 8: Refactoring & Constitutional Compliance (P2)

**Story Goal**: Refactor oversized files to meet constitutional 300 LOC limit and improve
modular separation of concerns.

**Independent Test Criteria**:

- All src files reduced to ≤ 300 LOC
- Public API contracts preserved during refactoring
- Unit tests added for extracted modules
- Existing tests continue to pass
- All 406+ tests still passing
- No regression in coverage

**Implementation Strategy**: Create refactor plans first → execute low-risk extractions
→ verify tests pass → integrate into build pipeline.

### Task Group 8.1: Refactor Planning & Analysis

- [x] T057 [P] Create `specs/003-extend-placeholder-create/filesize-scan.txt` with
  complete repo scan output identifying all oversized files and their current LOC
  (2h) ✅ 2025-10-19

- [x] T058 [P] Create `specs/003-extend-placeholder-create/refactor-plan-world.md`:
  propose splitting `src/ecs/world.ts` (470 LOC) into `createWorld.ts`,
  `simulationLoop.ts`, and `worldApi/*` modules. Include intended public APIs,
  dependency graph, and first extraction task (4h) ✅ 2025-10-19

- [x] T059 [P] Create `specs/003-extend-placeholder-create/refactor-plan-matchPlayer.md`:
  propose splitting `src/systems/matchTrace/matchPlayer.ts` (391 LOC) into
  `eventIndex.ts`, `playbackClock.ts`, and `replayRng.ts`. Include intended
  public APIs, dependency graph, and first extraction task (4h) ✅ 2025-10-19

- [x] T060 [P] Create `specs/003-extend-placeholder-create/refactor-plan-cameraControls.md`:
  propose extracting pure math helpers from `src/hooks/useCameraControls.ts`
  (342 LOC) into `src/utils/cameraMath.ts`, plus optional `useSpherical.ts` for
  state normalization. Include intended public APIs and first extraction task (3h) ✅ 2025-10-19

### Task Group 8.2: Low-Risk Extractions

- [x] T061 [P] Implement initial extraction: move camera math helpers into
  `src/utils/cameraMath.ts`, add unit tests `tests/unit/utils/cameraMath.test.ts`,
  update `useCameraControls.ts` imports, and verify all tests pass (2–3h) ✅ 2025-10-19
  - **Result**: cameraMath.ts created (128 LOC), useCameraControls.ts reduced to 299 LOC ✅
  - **Tests**: 406/407 passing, no regressions ✅

- [ ] T062 Implement `src/ecs/createWorld.ts` extraction: move factory logic from
  `world.ts`, add unit tests `tests/unit/ecs/createWorld.test.ts`, and verify
  public API preserved (3h)
  - **Current state**: world.ts at 300 LOC (just at limit, evaluate for skip)

- [ ] T063 Implement `src/systems/matchTrace/eventIndex.ts` extraction: move event
  indexing logic from `matchPlayer.ts`, add unit tests
  `tests/unit/systems/eventIndex.test.ts`, and verify integration (2–3h)
  - **Current state**: matchPlayer.ts at 391 LOC (91 lines over limit, priority target)

### Task Group 8.3: Validation & Integration

- [ ] T064 [P] Run full regression test suite after Phase 8 extractions
  - [ ] Run `npm run test` and verify 406+ tests still passing
  - [ ] Run `npm run lint` and verify 0 errors
  - [ ] Run `npm run test:coverage` and verify coverage ≥ 60%
  - [ ] Verify no TypeScript errors in strict mode

- [ ] T065 Update constitution check script to include refactored files and
  confirm all files now ≤ 300 LOC (1h)

- [ ] T066 Document refactoring outcomes in
  `specs/003-extend-placeholder-create/refactor-summary.md` including:
  - [ ] Before/after LOC breakdown by file
  - [ ] API contracts preserved
  - [ ] Test coverage impact
  - [ ] Migration notes for future developers (2h)

---

## Dependency Graph & Execution Order

### Blocking Dependencies

1. **Phase 1** (Setup) → all phases depend on project structure
2. **Phase 2** (Contract Validation) → blocks all user stories
3. **Phase 3** (US1: Run Match) → Phase 7 depends on US1 rendering
4. **Phase 7** (Live Rendering) → Phase 8 depends on stable rendering pipeline

### Phase 7 Dependencies

- **Depends on**: Phase 1, 2, 3 (rendering infrastructure)
- **Enables**: Phase 6 polish features (cinematic, metrics)
- **Parallelizable with**: Phase 4 (Quality), Phase 5 (Replay) — but Phase 7 enhances
  both by unifying live + replay paths

### Phase 8 Dependencies

- **Depends on**: Phase 1, 2, 3, 7 (stable rendering + test infrastructure)
- **Enables**: Constitutional compliance and modular architecture
- **Sequential after**: Phase 7 (requires stable test baseline)
- **Parallel planning**: T057–T060 refactor plans can start immediately

### Independent User Stories

- **US1** (Run Match) → starts after Phase 2
- **US2** (Quality Options) → depends on US1, enhanced by Phase 7
- **US3** (Replay) → depends on US1, unifies with live path in Phase 7
- **Phase 7** (Live Rendering) → depends on US1, integrates US2 + US3

### Parallelizable Tasks (marked [P])

- **Phase 2**: T004, T005, T007 (schema + validator creation)
- **Phase 3.1**: T011, T012, T014 (match timing)
- **Phase 3.2**: T015, T016, T017, T018 (entity rendering)
- **Phase 3.3**: T020 (validation)
- **Phase 4**: T027, T029, T030, T031, T034 (quality profiles)
- **Phase 5**: T035, T037, T039, T042 (replay infrastructure)
- **Phase 6**: T043, T045 (debugging/monitoring)
- **Phase 7**: T050, T051, T052, T053, T056 (live trace + UI)
- **Phase 8**: T057, T058, T059, T060, T061, T064 (refactor plans + low-risk extractions)

### Sequential Within Stories

- **US1**: Complete T011–T014 (timing) before T015–T022 (entities, victory)
- **US2**: Complete T027–T028 before T029–T033 (HUD + rendering)
- **US3**: Complete T035–T036 before T037–T042 (controls + validation)
- **Phase 8**: Complete T057–T060 (planning) before T061–T063 (extractions);
  then T064–T066 (validation + documentation)

---

## Phase Strategy & MVP Scope

### Recommended MVP

**Phase 1 + 2 + 3**: Setup → Contract Validation → Run Match

- Setup and contracts: ~4 hours
- Run a match (US1): ~12 hours
- **Total MVP effort**: ~16 hours

**MVP Result**: Fully functional automated 3D match with deterministic
simulation-renderer sync.

### Enhanced MVP (Add Live Rendering)

**Phase 1 + 2 + 3 + 7**: Setup → Contracts → Run Match → Live Rendering

- Setup and contracts: ~4 hours
- Run a match (US1): ~12 hours
- Live playback (Phase 7): ~6 hours
- **Total effort**: ~22 hours

**Enhanced MVP Result**: Live-rendered matches with real-time trace capture and
proper between-rounds flow.

### Full Feature Implementation

**Phase 1–7**: All user stories + live rendering

- Phases 1–3 (MVP): ~16 hours
- Phase 4 (Quality profiles): ~6 hours
- Phase 5 (Deterministic replay): ~8 hours
- Phase 7 (Live rendering): ~6 hours
- **Total effort**: ~36 hours

### With Polish (Add Phase 6)

- Cinematic camera, monitoring, documentation: ~4 hours
- **Total end-to-end**: ~40 hours

### With Constitutional Compliance (Add Phase 8)

- Phase 8 (Refactoring & compliance): ~21 hours
- **Total including refactoring**: ~61 hours

---

## Task Format Validation

✅ **All tasks follow strict checklist format**:

- [x] Each task has checkbox `- [ ]`
- [x] Each task has sequential ID (T001–T049)
- [x] Parallelizable tasks marked with `[P]`
- [x] User story tasks marked with `[US#]`
- [x] All tasks include descriptive labels/file paths
- [x] Dependencies documented in graph above
- [x] Lines under 120 characters (markdown compliance)

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 66 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Contracts) | 7 |
| Phase 3 (US1) | 16 |
| Phase 4 (US2) | 8 |
| Phase 5 (US3) | 8 |
| Phase 6 (Polish) | 7 |
| Phase 7 (Live Rendering) | 7 |
| Phase 8 (Refactoring) | 10 |
| **Parallelizable** | **28** |
| **MVP (1–3)** | 26 tasks (~16h) |
| **Enhanced MVP (1–3, 7)** | 33 tasks (~22h) |
| **Full (1–7)** | 49 tasks (~36h) |
| **Full + Polish (1–7, 6)** | 56 tasks (~40h) |
| **Full + Refactoring (1–8)** | 66 tasks (~61h) |
| **Status** | **✅ PHASES 1–7 COMPLETE (56/56)** |
| **Phase 8** | **🔄 IN PROGRESS (5/10 complete, ~5h invested, ~16h remain)** |
| **Phase 8 Progress** | **T057–T061 ✅ (planning + extraction)** |
| **useCameraControls** | **299 LOC ✅** |
| **world.ts** | **300 LOC ✅** |
| **matchPlayer.ts** | **391 LOC ⚠️** |
| **Tests Passing** | **406/407 (99.8%)** |
| **ESLint** | **0 errors** |
| **TypeScript** | **✅ Strict mode** |
| **Coverage** | **60.21%** |

---

## How to Use This Task List

1. **Start with Phase 1 & 2** to establish infrastructure and validate contracts.
2. **Pick one user story** (US1, US2, or US3) and complete all tasks in order.
3. **Use parallelizable tasks [P]** to accelerate development.
4. **Run tests after each phase** to validate correctness.
5. **For MVP, focus on Phase 1–3** (US1).
6. **Reference the dependency graph** for task ordering.

---

Generated by speckit.tasks workflow for RobotSpaceBattler feature `003-extend-placeholder-create`.

---

## FR-011 Status: Refactor Tasks for Oversized Files (>300 LOC) — TRACKED IN PHASE 8

Tasks T057–T066 are now formally tracked in **Phase 8: Refactoring & Constitutional Compliance** (see above).

Target files exceed constitutional 300 LOC limit:

- `src/ecs/world.ts` (470 LOC) → refactor plan T058, extraction T062
- `src/systems/matchTrace/matchPlayer.ts` (391 LOC) → refactor plan T059, extraction T063
- `src/hooks/useCameraControls.ts` (342 LOC) → refactor plan T060, extraction T061

**Refactoring Approach**:

- Create detailed refactor plans (T057–T060) with API contracts and test strategy
- Execute low-risk, high-impact extractions first (T061–T063)
- Validate with full regression test suite (T064)
- Update constitution checks and document outcomes (T065–T066)
- Each extraction includes unit tests before code moves to preserve public API
- All tests must pass before merging refactored code

**Phase 8 starts after Phase 7 completion. Estimated total effort: ~21 hours.**
