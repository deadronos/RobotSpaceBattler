# Tasks: 3D Team Fight — extend-placeholder-create

**Feature**: Extend 001 & 002 — 3D Team Fight Match with Graphics Integration  
**Branch**: `003-extend-placeholder-create`  
**Generated**: 2025-10-18  
**Total Tasks**: 49 | **Phases**: 6

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

- [ ] T050 [P] Create `src/hooks/useLiveMatchTrace.ts` hook
  - [ ] Capture spawn events from entity creation
  - [ ] Capture move events from position deltas
  - [ ] Capture fire events from projectile creation
  - [ ] Capture damage events from health changes
  - [ ] Capture death events from entity elimination
  - [ ] Assign sequenceId for deterministic tie-breaking
  - [ ] Track RNG seed and algorithm metadata
  - [ ] Return growing MatchTrace object

### Task Group 7.2: Wire Live Trace to Renderer

- [ ] T051 [P] Wire live trace to `src/components/Scene.tsx`
  - [ ] Import `useLiveMatchTrace` hook
  - [ ] Call hook in Simulation component
  - [ ] Pass live trace to MatchSceneInner
  - [ ] Remove static RobotPlaceholder components
  - [ ] Verify entities render dynamically
  - [ ] Verify HUD shows entity count and progress
  - [ ] Test match renders from spawn to victory

### Task Group 7.3: Quality Toggle & Visual Controls

- [ ] T052 [P] Add quality toggle to UI
  - [ ] Create button in `src/components/hud/ControlStrip.tsx`
  - [ ] Extend UI store for quality selector
  - [ ] Update `useVisualQuality` hook
  - [ ] Toggle High/Medium/Low quality on button click
  - [ ] Verify visual changes without affecting trace
  - [ ] Verify outcome identical across profiles
  - [ ] Test quality toggle during active match

### Task Group 7.4: Between-Rounds UI & Match Flow

- [ ] T053 [P] Create `src/components/match/BetweenRoundsUI.tsx`
  - [ ] Display match result summary (winner, team stats)
  - [ ] Show kill/damage breakdown by entity
  - [ ] Implement "Rematch" button (new RNG seed)
  - [ ] Implement "Team Selection" screen
  - [ ] Add "Export Trace" button (save as JSON)
  - [ ] Wire victory callback to UI display
  - [ ] Test rematch flow end-to-end

### Task Group 7.5: Integration & Validation

- [ ] T054 [US3] Write tests in `tests/unit/liveTrace.test.ts`
  - [ ] Test spawn event capture
  - [ ] Test move event capture
  - [ ] Test fire event capture
  - [ ] Test damage event capture
  - [ ] Test death event capture
  - [ ] Test sequenceId ordering
  - [ ] Test RNG metadata recording

- [ ] T055 [US3] Write E2E test in `playwright/tests/live-match-rendering.spec.ts`
  - [ ] Start app and see match rendering
  - [ ] Verify robots move and fire
  - [ ] Verify damage indicators
  - [ ] Verify victory overlay
  - [ ] Test quality toggle during match
  - [ ] Test rematch flow

- [ ] T056 [P] Verify no regression in existing tests
  - [ ] Run full test suite: `npm run test`
  - [ ] Verify 367/368 tests still passing
  - [ ] Run linter: `npm run lint`
  - [ ] Verify 0 ESLint errors
  - [ ] Run coverage: `npm run test:coverage`
  - [ ] Verify coverage maintained or improved

---

## Dependency Graph & Execution Order

### Blocking Dependencies

1. **Phase 1** (Setup) → all phases depend on project structure
2. **Phase 2** (Contract Validation) → blocks all user stories

### Independent User Stories

- **US1** (Run Match) → starts after Phase 2
- **US2** (Quality Options) → depends on US1, can run in parallel
- **US3** (Replay) → depends on US1, can run in parallel

### Parallelizable Tasks (marked [P])

- **Phase 2**: T004, T005, T007 (schema + validator creation)
- **Phase 3.1**: T011, T012, T014 (match timing)
- **Phase 3.2**: T015, T016, T017, T018 (entity rendering)
- **Phase 3.3**: T020 (validation)
- **Phase 4**: T027, T029, T030, T031, T034 (quality profiles)
- **Phase 5**: T035, T037, T039, T042 (replay infrastructure)
- **Phase 6**: T043, T045 (debugging/monitoring)

### Sequential Within Stories

- **US1**: Complete T011–T014 (timing) before T015–T022 (entities, victory)
- **US2**: Complete T027–T028 before T029–T033 (HUD + rendering)
- **US3**: Complete T035–T036 before T037–T042 (controls + validation)

---

## Phase Strategy & MVP Scope

### Recommended MVP

**Phase 1 + 2 + 3**: Setup → Contract Validation → Run Match

- Setup and contracts: ~4 hours
- Run a match (US1): ~12 hours
- **Total MVP effort**: ~16 hours

**MVP Result**: Fully functional automated 3D match with deterministic
simulation-renderer sync.

### Full Feature Implementation

**Phase 1–5**: Add visual quality + replay

- Add quality tuning (US2): ~6 hours
- Add deterministic replay (US3): ~8 hours
- **Total effort**: ~30 hours

### With Polish (Phase 6)

- Cinematic camera, monitoring, documentation: ~4 hours
- **Total end-to-end**: ~34 hours

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
| Total Tasks | 49 |
| Phase 1 (Setup) | 3 |
| Phase 2 (Contracts) | 7 |
| Phase 3 (US1) | 16 |
| Phase 4 (US2) | 8 |
| Phase 5 (US3) | 8 |
| Phase 6 (Polish) | 7 |
| **Parallelizable** | **16** |
| **MVP (1–3)** | 26 tasks (~16h) |
| **Full (1–5)** | 42 tasks (~30h) |
| **Polish (1–6)** | 49 tasks (~34h) |
| **Status** | **✅ ALL 49 COMPLETE** |
| **Tests Passing** | **367/368 (99.7%)** |
| **ESLint** | **0 errors** |
| **TypeScript** | **✅ Strict mode** |
| **Coverage** | **59% statements** |

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
