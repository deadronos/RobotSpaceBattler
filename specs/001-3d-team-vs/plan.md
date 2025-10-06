# Implementation Plan: 3D Team vs Team Autobattler Game Simulation

**Branch**: `001-3d-team-vs` | **Date**: 2025-10-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-3d-team-vs/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Build a 3D team-based autobattler simulation where 10 red robots fight 10 blue robots in a space-station arena with physics-based combat, multi-layered AI, and dynamic camera system. Primary technical approach: React + react-three-fiber for rendering, Miniplex ECS for game logic, Rapier3D for authoritative physics, with procedural mesh generation for initial assets.

## Technical Context

**Language/Version**: TypeScript 5.x (ES2022 target), React 19+  
**Primary Dependencies**: 
- `react-three-fiber` (@react-three/fiber) - 3D rendering in React
- `@react-three/drei` - r3f helper utilities
- `@react-three/rapier` - Rapier3D physics integration (authoritative)
- `miniplex` - ECS entity management and queries
- `zustand` - UI state management
- `@react-three/postprocessing` - Post-processing effects (toggleable)
- `@react-three/gltfjsx` - Asset conversion (future: Blender meshes)
- `vite` - Build tool
- `vitest` - Unit/integration testing
- `eslint`, `prettier` - Code quality
- `playwright` - E2E testing (manual)

**Storage**: Browser memory (in-memory ECS world), optional localStorage for settings/stats  
**Testing**: Vitest for unit/integration, Playwright for E2E validation  
**Target Platform**: Chrome 120+, Edge 120+ (modern Chromium with WebGL 2.0)  
**Project Type**: Single-page web application (frontend only)  
**Performance Goals**: 60 fps target, 30 fps minimum; <16ms frame time for interactive gameplay  
**Constraints**: 
- 300 LOC per source file (constitutional requirement)
- Rendering separated from simulation/physics
- TDD workflow mandatory (tests before implementation)
- GPU instancing for 20+ robot entities

**Scale/Scope**: 
- 20 robot entities (10v10)
- 3 weapon types with rock-paper-scissors balance
- Hybrid camera system (free + cinematic modes)
- Multi-layered AI (individual + team captain coordination)
- Performance management system (quality scaling, time dilation)
- Post-battle statistics tracking

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Test-First (TDD) Evidence**:
- ✅ Contract tests planned for weapon balance system (rock-paper-scissors)
- ✅ Integration tests planned for AI behavior (individual + captain coordination)
- ✅ Contract tests planned for robot spawning (10v10 in designated zones)
- ✅ Integration tests planned for victory flow (5-sec countdown, stats, reset)
- ✅ Performance tests planned (60 fps target, quality scaling validation)

**File Sizing & Separation**:
- ✅ All planned modules designed to stay under 300 LOC:
  - ECS world setup: ~150 LOC
  - Individual entity types (Robot, Weapon, Projectile): 80-120 LOC each
  - Camera system split into multiple hooks: useCameraControls (~150 LOC), useTouchControls (~100 LOC), useCinematicMode (~120 LOC)
  - AI systems decomposed: individualAI.ts (~200 LOC), captainAI.ts (~180 LOC), adaptiveStrategy.ts (~150 LOC)
  - Performance manager: ~200 LOC with separate quality scaling and time dilation modules
- ⚠️ Risk areas requiring monitoring: Weapon balance system, Physics integration

**React/r3f Best Practices**:
- ✅ Rendering separated from simulation: r3f components consume ECS state via hooks
- ✅ useFrame limited to: camera updates, visual interpolation, performance monitoring
- ✅ Physics authoritative: Rapier3D updates positions, r3f renders
- ✅ Asset loading via Suspense: procedural meshes wrapped in Suspense boundaries
- ✅ GPU instancing planned for 20 robot entities
- ✅ Memoization strategy documented for robot/projectile components

**Target Platform Baseline**:
- ✅ Chrome 120+, Edge 120+ (WebGL 2.0 required)
- ✅ No polyfills needed (modern Chromium features only)
- ✅ Touch input support for mobile/tablet (pinch-zoom gestures)

**Deprecation & Redundancy Plan**:
- ✅ N/A - This is a new feature, no existing code to deprecate
- 📝 Future consideration: mark procedural meshes as deprecated when Blender assets ready

**Agentic AI Triggers Check**:
- ✅ No automation triggers: This plan does not add merge/deploy automation
- ✅ No CI/CD permission changes required
- ✅ Standard PR review workflow applies

**Initial Gate Status**: ✅ **PASS** - All constitutional requirements met

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
src/
├── ecs/
│   ├── world.ts                    # Miniplex world initialization
│   ├── entities/
│   │   ├── Robot.ts                # Robot entity archetype
│   │   ├── Weapon.ts               # Weapon entity archetype
│   │   ├── Projectile.ts           # Projectile entity archetype
│   │   ├── Team.ts                 # Team entity archetype
│   │   └── Arena.ts                # Arena configuration entity
│   ├── systems/
│   │   ├── spawnSystem.ts          # Robot spawning logic
│   │   ├── weaponSystem.ts         # Weapon balance & damage calculations
│   │   ├── physicsSystem.ts        # Physics integration with Rapier
│   │   ├── aiSystem.ts             # Main AI coordination
│   │   ├── individualAI.ts         # Cover-seeking, retreat logic
│   │   ├── captainAI.ts            # Team captain coordination
│   │   ├── adaptiveStrategy.ts     # Health/advantage-based tactics
│   │   ├── victorySystem.ts        # Win condition & reset logic
│   │   └── statsSystem.ts          # Battle statistics tracking
│   └── queries.ts                  # Reusable Miniplex queries
├── components/
│   ├── Arena.tsx                   # Space-station environment renderer
│   ├── Robot.tsx                   # Robot mesh & visual state
│   ├── Weapon.tsx                  # Weapon visual effects
│   ├── Projectile.tsx              # Projectile trail & impact effects
│   ├── Camera.tsx                  # Camera rig wrapper
│   ├── VictoryScreen.tsx           # Victory UI overlay
│   ├── StatsScreen.tsx             # Post-battle statistics UI
│   ├── PerformanceWarning.tsx      # Performance degradation overlay
│   └── Lighting.tsx                # Directional & ambient lights
├── hooks/
│   ├── useCameraControls.ts        # Mouse/keyboard camera controls
│   ├── useTouchControls.ts         # Touch/pinch camera controls
│   ├── useCinematicMode.ts         # Auto-follow camera mode
│   ├── usePhysicsSync.ts           # Sync ECS ↔ Rapier positions
│   ├── useStatsTracking.ts         # Stats aggregation hook
│   └── usePerformanceMonitor.ts    # FPS tracking & quality scaling
├── systems/
│   ├── performanceManager.ts       # Quality scaling & time dilation
│   └── qualityScaler.ts            # Shadow/particle/draw distance adjustments
├── utils/
│   ├── meshGenerators.ts           # Procedural robot/weapon meshes
│   ├── damageCalculator.ts         # Rock-paper-scissors damage logic
│   └── teamColorMapper.ts          # Red/blue material assignments
├── store/
│   └── uiStore.ts                  # Zustand store for UI state
└── App.tsx                         # Root application component

tests/
├── contracts/
│   ├── robot-spawning.test.ts      # FR-001 validation
│   ├── weapon-balance.test.ts      # FR-003 validation
│   ├── victory-flow.test.ts        # FR-006 validation
│   └── camera-system.test.ts       # FR-013 validation
├── integration/
│   ├── ai-behavior.test.ts         # FR-002 (multi-layered AI)
│   ├── physics-sync.test.ts        # FR-012 (Rapier integration)
│   ├── performance.test.ts         # FR-010, FR-021-023 validation
│   └── stats-tracking.test.ts      # FR-019 validation
└── unit/
    ├── damageCalculator.test.ts    # Rock-paper-scissors logic
    ├── qualityScaler.test.ts       # Performance scaling
    └── meshGenerators.test.ts      # Procedural geometry

playwright/tests/
└── e2e-simulation.spec.ts          # Full battle flow validation
```

**Structure Decision**: Single-project layout (frontend only). Game is a standalone web application with no backend server. State management via Miniplex ECS + Zustand for UI. Physics authoritative in-browser via Rapier3D. All modules sized to stay under 300 LOC constitutional limit.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh copilot`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

Based on Phase 1 design artifacts, the /tasks command will generate approximately 25-30 tasks organized by TDD workflow:

**From Contracts (tests/contracts/)**:
- T001: Contract test for robot spawning (spawn-contract.md → FR-001 validation)
- T002: Contract test for weapon balance (scoring-contract.md → FR-003 validation)
- T003: Contract test for victory flow (FR-006 validation)
- T004: Contract test for camera system (FR-013 validation)

**From Data Model (ECS entities)**:
- T005: [P] Robot entity archetype (entities/Robot.ts)
- T006: [P] Weapon entity archetype (entities/Weapon.ts)
- T007: [P] Projectile entity archetype (entities/Projectile.ts)
- T008: [P] Team entity (entities/Team.ts)
- T009: [P] Arena entity (entities/Arena.ts)
- T010: Miniplex world initialization (ecs/world.ts)

**From Systems (game logic)**:
- T011: Spawn system implementation (systems/spawnSystem.ts) → makes T001 pass
- T012: Weapon system with damage calculator (systems/weaponSystem.ts, utils/damageCalculator.ts) → makes T002 pass
- T013: [P] Individual AI system (systems/individualAI.ts)
- T014: [P] Captain AI system (systems/captainAI.ts)
- T015: [P] Adaptive strategy system (systems/adaptiveStrategy.ts)
- T016: Victory system (systems/victorySystem.ts) → makes T003 pass
- T017: Stats tracking system (systems/statsSystem.ts)
- T018: Physics sync hook (hooks/usePhysicsSync.ts)

**From Components (rendering)**:
- T019: [P] Arena component (components/Arena.tsx)
- T020: [P] Robot component (components/Robot.tsx)
- T021: [P] Projectile component (components/Projectile.tsx)
- T022: Camera rig wrapper (components/Camera.tsx)
- T023: [P] Victory screen UI (components/VictoryScreen.tsx)
- T024: [P] Stats screen UI (components/StatsScreen.tsx)
- T025: [P] Performance warning overlay (components/PerformanceWarning.tsx)

**From Camera System (decomposed hooks)**:
- T026: [P] Free camera controls hook (hooks/useCameraControls.ts) → makes T004 pass
- T027: [P] Touch controls hook (hooks/useTouchControls.ts)
- T028: [P] Cinematic mode hook (hooks/useCinematicMode.ts)

**From Performance Management**:
- T029: [P] Performance monitor hook (hooks/usePerformanceMonitor.ts)
- T030: [P] Quality scaler system (systems/qualityScaler.ts)

**Ordering Strategy**:

**Phase 1: Setup & Infrastructure** (T001-T004)
- Contract tests written FIRST (all must fail initially per TDD)
- Tests [P] parallelizable (independent files)

**Phase 2: ECS Foundation** (T005-T010)
- Entity archetypes [P] parallelizable (separate files)
- World initialization depends on entity types

**Phase 3: Core Systems** (T011-T018)
- Implementation makes contract tests pass
- Systems can run [P] if they don't share state
- Physics sync depends on entity positions

**Phase 4: Rendering** (T019-T025)
- Components [P] parallelizable (separate files)
- Each component consumes ECS state via hooks

**Phase 5: Camera & Performance** (T026-T030)
- Camera hooks [P] parallelizable (independent controls)
- Performance systems [P] parallelizable (monitoring vs scaling)

**Dependencies**:
```
Setup (T001-T004) → Foundation (T005-T010) → Systems (T011-T018) → Rendering (T019-T025) → Polish (T026-T030)
                                                                            
TDD Gate: T001-T004 MUST fail before T011+ can start
```

**Parallelization Examples**:
- T005-T009: All entity files can be written simultaneously
- T013-T015: All AI systems independent, can develop in parallel
- T019-T025: All components read from ECS, no shared mutations

**Estimated Output**: 30 numbered tasks with clear dependencies and parallel execution markers

**Constitutional Compliance**:
- All tasks specify exact file paths
- File size estimates included (all < 300 LOC per constitution)
- TDD ordering enforced (tests before implementation)
- Decomposition applied to large systems (camera, AI, performance)

**IMPORTANT**: This phase will be executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - research.md created
- [x] Phase 1: Design complete (/plan command) - data-model.md, contracts/, quickstart.md created
- [x] Phase 2: Task planning complete (/plan command - approach described)
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md created with 37 tasks
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all gates validated)
- [x] Post-Design Constitution Check: PASS (design artifacts reviewed)
- [x] All NEEDS CLARIFICATION resolved (Technical Context complete)
- [ ] Complexity deviations documented (N/A - no violations)

**Artifacts Created**:
- ✅ plan.md (this file)
- ✅ research.md (10 technical decisions documented)
- ✅ data-model.md (6 entity archetypes with relationships, validation rules, lifecycles)
- ✅ contracts/scoring-contract.md (weapon balance validation)
- ✅ contracts/spawn-contract.md (robot spawning validation)
- ✅ quickstart.md (validation and demonstration guide)
- ✅ tasks.md (37 numbered tasks across 5 phases)

**Next Steps**:
1. Begin TDD execution: write contract tests (T008-T009) - all must fail
2. Write integration tests (T010-T013) - all must fail
3. Implement entity archetypes (T014-T019)
4. Initialize ECS world (T020)
5. Implement systems (T021-T027)
6. Implement rendering components (T028-T035)
7. Implement integration systems (T036-T037)
8. Execute quickstart.md validation scenarios
9. Submit PR with CONSTITUTION-CHECK section

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
