# Tasks: 3D Team vs Team Autobattler Game Simulation

**Input**: Design documents from `/specs/001-3d-team-vs/`
**Prerequisites**: spec.md (completed), plan.md (pending)

## Task Status Legend
- ✅ **Completed**: Implementation finished, tests passing
- 🔄 **In Progress**: Currently being worked on
- ⏸️ **Blocked**: Waiting on dependencies
- ⬜ **Not Started**: Ready to begin when dependencies clear

## Phase 3.1: Setup & Infrastructure

- [x] **T001** ✅ Create project structure with src/, tests/, playwright/ directories
  - Status: Completed
  - Files: Project root structure
  - Notes: Basic Vite + React + TypeScript setup already in place

- [x] **T002** ✅ [P] Configure ESLint, Prettier, and TypeScript strict mode
  - Status: Completed
  - Files: `eslint.config.cjs`, `prettierrc.txt`, `tsconfig.json`
  - Notes: Constitution-compliant linting rules active

- [ ] **T003** 🔄 [P] Add source-size CI check for 300 LOC constitution limit
  - Status: In Progress
  - Files: `.github/workflows/constitution_checks.yml`, `scripts/check_source_size.js`
  - Notes: CI infrastructure exists, needs integration with feature branch workflow

- [ ] **T004** ⬜ [P] Install and configure @react-three/fiber, @react-three/drei dependencies
  - Status: Not Started
  - Files: `package.json`
  - Dependencies: None

- [ ] **T005** ⬜ [P] Install and configure @react-three/rapier physics engine
  - Status: Not Started
  - Files: `package.json`
  - Dependencies: None

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T006** ⬜ [P] Contract test: Robot spawning (10 red + 10 blue robots in designated zones)
  - Status: Not Started
  - Files: `tests/contracts/robot-spawning.test.ts`
  - Acceptance: FR-001 validation
  - Dependencies: None

- [x] **T007** ✅ [P] Contract test: Weapon rock-paper-scissors balance system
  - Status: Completed
  - Files: `tests/contracts/weapon-balance.test.ts`
  - Acceptance: FR-003 validation (Laser beats Gun, Gun beats Rocket, Rocket beats Laser)
  - Notes: Test suite written, currently failing (expected)

- [ ] **T008** 🔄 [P] Integration test: Multi-layered AI behavior (individual + captain)
  - Status: In Progress
  - Files: `tests/integration/ai-behavior.test.ts`
  - Acceptance: FR-002 validation (tactical cover-seeking, captain coordination)
  - Dependencies: None
  - Notes: Individual AI test cases written, captain system tests pending

- [ ] **T009** ⬜ [P] Integration test: Victory flow with stats and auto-restart
  - Status: Not Started
  - Files: `tests/integration/victory-flow.test.ts`
  - Acceptance: FR-006, FR-019 validation (5-sec countdown, stats button, team composition settings)
  - Dependencies: None

## Phase 3.3: Core ECS & Simulation (ONLY after tests are failing)

- [ ] **T010** 🔄 Create Miniplex world and core entity archetypes
  - Status: In Progress
  - Files: `src/ecs/world.ts` (85 LOC)
  - Entities: Robot, Weapon, Projectile, Team, SimulationState
  - Dependencies: T007 (weapon balance tests must fail first)
  - Notes: World initialization done, entity archetypes 60% complete

- [x] **T011** ✅ [P] Robot entity with team affiliation, health, position, AI state, captain flag
  - Status: Completed
  - Files: `src/ecs/entities/Robot.ts` (120 LOC)
  - Dependencies: T010
  - Notes: Includes captain role, AI state machine, stats tracking

- [ ] **T012** ⬜ Weapon system with rock-paper-scissors damage modifiers
  - Status: Not Started
  - Files: `src/ecs/systems/weaponSystem.ts` (estimated 180 LOC)
  - Dependencies: T007 (tests), T011
  - Blocks: T013

## Phase 3.4: Rendering & Camera

- [ ] **T013** ⏸️ Hybrid camera system (free controls + cinematic mode)
  - Status: Blocked
  - Files: `src/components/Camera.tsx` (estimated 240 LOC), `src/hooks/useCameraControls.ts` (estimated 150 LOC)
  - Acceptance: FR-013, FR-018 (mouse/keyboard/touch controls, pinch-zoom)
  - Dependencies: T004 (r3f setup)
  - Notes: Will need decomposition into multiple sub-280 LOC modules per constitution

## Phase 3.5: Polish & Performance

- [ ] **T014** ⬜ [P] Performance management system (quality scaling, time scale, warning overlay)
  - Status: Not Started
  - Files: `src/systems/performanceManager.ts` (estimated 200 LOC), `src/components/PerformanceWarning.tsx` (estimated 80 LOC)
  - Acceptance: FR-021, FR-022, FR-023 (toggleable quality scaling, simulation slowdown, non-intrusive warnings)
  - Dependencies: T010, T012

- [ ] **T015** ⬜ [P] Post-battle stats tracking and display component
  - Status: Not Started
  - Files: `src/components/StatsScreen.tsx` (estimated 220 LOC), `src/hooks/useStatsTracking.ts` (estimated 90 LOC)
  - Acceptance: FR-019 (per-robot kills, damage dealt/taken, time survived, team aggregates)
  - Dependencies: T011

## Dependencies Graph

```
Setup (T001-T005)
  ↓
Tests (T006-T009) ← GATE: Must fail before implementation
  ↓
T010 (ECS World)
  ├→ T011 (Robot Entity) → T012 (Weapon System)
  └→ T013 (Camera) [blocked on T004]
     
T014 (Performance) ← needs T010, T012
T015 (Stats) ← needs T011

All parallel [P] tasks can run simultaneously within their phase
```

## Parallel Execution Examples

### Phase 3.1 Setup (can run simultaneously)
```bash
# T002, T003, T004, T005 are independent
npm run setup:lint & npm run setup:ci & npm install @react-three/fiber @react-three/drei & npm install @react-three/rapier
```

### Phase 3.2 Tests (can run simultaneously)
```bash
# T006, T007, T008, T009 are independent contract/integration tests
vitest tests/contracts/robot-spawning.test.ts &
vitest tests/contracts/weapon-balance.test.ts &
vitest tests/integration/ai-behavior.test.ts &
vitest tests/integration/victory-flow.test.ts
```

### Phase 3.5 Polish (can run simultaneously)
```bash
# T014 and T015 are independent
vitest src/systems/performanceManager.test.ts & vitest src/hooks/useStatsTracking.test.ts
```

## Constitution Compliance Notes

### File Size Management
- **T013 Camera System**: Estimated 390 LOC total → MUST decompose into:
  - `src/components/Camera.tsx` (core component, <240 LOC)
  - `src/hooks/useCameraControls.ts` (mouse/keyboard, <150 LOC)
  - `src/hooks/useTouchControls.ts` (touch/pinch, <100 LOC)
  - `src/hooks/useCinematicMode.ts` (auto-follow, <120 LOC)

- **T012 Weapon System**: Monitor closely, consider decomposition if exceeds 280 LOC:
  - `src/ecs/systems/weaponSystem.ts` (core logic)
  - `src/ecs/systems/weaponBalanceCalculator.ts` (rock-paper-scissors modifiers)

### TDD Gate Enforcement
- ⚠️ **BLOCKER**: T010, T011, T012 CANNOT start until T006-T009 tests are written and failing
- Current Status: T007 ✅ failing (good), T008 🔄 partially failing, T006 and T009 ⬜ not written yet

### Agentic AI Triggers
- T013: Complex camera system → candidate for AI-assisted decomposition planning
- T014: Performance heuristics → candidate for AI-suggested optimization patterns

## Notes
- Total tasks: 15 (3.1: 5 tasks, 3.2: 4 tasks, 3.3: 3 tasks, 3.4: 1 task, 3.5: 2 tasks)
- Completed: 4 tasks (27%)
- In Progress: 3 tasks (20%)
- Blocked: 1 task (7%)
- Not Started: 7 tasks (47%)
- [P] tasks = different files, no dependencies within phase
- Verify tests fail before implementing (TDD gate)
- Commit after each task completion
- Run `npm run check:source-size` before marking any task complete
