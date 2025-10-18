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
- [ ] T016 [P] [US1] Implement `src/components/match/RenderedRobot.tsx`
- [ ] T017 [US1] Create `src/components/match/RenderedProjectile.tsx`
- [x] T018 [P] [US1] Extend `src/components/match/MatchPlayer.tsx`
- [ ] T019 [US1] Implement asset fallback in `src/systems/matchTrace/assetLoader.ts`

### Task Group 3.3: Victory & Match End State

- [ ] T020 [P] [US1] Create `src/systems/matchTrace/matchValidator.ts`
- [ ] T021 [US1] Implement `src/components/match/MatchHUD.tsx`
- [ ] T022 [US1] Implement `src/components/match/MatchCinematic.tsx` stub

### Task Group 3.4: Integration & Match Execution

- [ ] T023 [P] [US1] Create `src/hooks/useMatchSimulation.ts` orchestrator
- [ ] T024 [US1] Integrate components into `src/components/Scene.tsx`
- [ ] T025 [US1] Write tests in `tests/unit/matchPlayer.test.ts`
- [ ] T026 [US1] Write tests in `tests/unit/entityMapper.test.ts`

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

- [ ] T027 [P] [US2] Create `src/systems/matchTrace/visualQualityProfile.ts`
- [ ] T028 [US2] Implement `src/hooks/useVisualQuality.ts` hook
- [ ] T029 [P] [US2] Create `src/components/match/QualityToggle.tsx`

### Task Group 4.2: Rendering Integration

- [ ] T030 [P] [US2] Extend `RenderedRobot.tsx` with quality parameters
- [ ] T031 [P] [US2] Extend `RenderedProjectile.tsx` with quality parameters
- [ ] T032 [US2] Update `matchPlayer.ts` to pass quality profile

### Task Group 4.3: Testing

- [ ] T033 [US2] Write tests in `tests/unit/visualQualityProfile.test.ts`
- [ ] T034 [P] [US2] Write E2E test in `playwright/tests/quality-toggle.spec.ts`

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

- [ ] T035 [P] [US3] Implement `src/systems/matchTrace/rngManager.ts`
- [ ] T036 [US3] Extend `matchPlayer.ts` for replay mode with RNG seed
- [ ] T037 [P] [US3] Implement `src/hooks/useMatchReplay.ts` hook
- [ ] T038 [US3] Create `src/components/match/ReplayControls.tsx`

### Task Group 5.2: Replay Integration

- [ ] T039 [P] [US3] Add replay mode toggle to `useMatchSimulation.ts`
- [ ] T040 [US3] Write tests in `tests/unit/matchReplay.test.ts`
- [ ] T041 [US3] Write tests in `tests/unit/eventTiming.test.ts`
- [ ] T042 [P] [US3] Write E2E test in `playwright/tests/deterministic-replay.spec.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

Final integration, debugging, and optimization (optional for MVP).

- [ ] T043 [P] Implement post-victory cinematic camera sweep
- [ ] T044 Implement debug logging in `src/systems/matchTrace/debug.ts`
- [ ] T045 [P] Add performance hooks in `src/hooks/usePerformanceMetrics.ts`
- [ ] T046 Run full test suite: `npm run test` + `npm run playwright:test`
- [ ] T047 Run linter: `npm run lint` and fix issues
- [ ] T048 Generate coverage: `npm run test:coverage` and verify coverage
- [ ] T049 Document implementation in `specs/003-extend-placeholder-create/implementation-notes.md`

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
