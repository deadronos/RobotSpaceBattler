# Implementation Notes: 3D Team vs Team Autobattler

**Branch**: `001-3d-team-vs`  \
**Date**: 2025-10-06  \
**Spec**: [spec.md](./spec.md)  \
**Status**: As-built notes (supersedes earlier aspirational plan)

The original plan for this feature described a larger UI surface area (victory overlay, stats modal, performance banner, settings for team composition). The current repository implements the core simulation loop and a minimal UI shell.

## Architecture (as built)

- `App` creates and owns:
  - `BattleWorld` (Miniplex ECS container)
  - `TelemetryPort` (bridges runtime events into the telemetry store)
  - `MatchStateMachine` (phase: initializing/running/paused/victory)
- `Simulation` wires:
  - `Scene` (r3f `Canvas`, lights, shadows, `OrbitControls`)
  - `@react-three/rapier` `Physics` world (for environment colliders + raycasting)
  - `BattleRunner` (the authoritative simulation loop)
- `BattleRunner.step(deltaSeconds)`:
  - advances time
  - updates obstacles/hazards
  - when `phase === "running"`, updates core systems:
    - AI (`updateAISystem`)
    - firing (`updateCombatSystem`)
    - movement/collision (`updateMovementSystem`)
    - projectiles and impacts (`updateProjectileSystem`)
    - visual effects (`updateEffectSystem`)
  - evaluates victory and starts restart countdown
  - triggers a fresh match spawn when countdown reaches 0

## Source Layout (current)

- Simulation loop: `src/runtime/simulation/battleRunner.ts`
- Match state: `src/runtime/state/matchStateMachine.ts`
- ECS container and entities: `src/ecs/world.ts`
- ECS systems: `src/ecs/systems/*.ts`
- AI implementation: `src/simulation/ai/*` and `src/ecs/systems/aiSystem.ts`
- Weapons/damage: `src/simulation/combat/weapons.ts`
- Team spawn configuration: `src/lib/teamConfig.ts`
- UI shell: `src/App.tsx`, `src/components/Scene.tsx`, `src/components/Simulation.tsx`, `src/components/ui/SettingsModal.tsx`

## Known Gaps vs earlier drafts

- No victory overlay UI (status is text only).
- No post-battle stats UI (telemetry exists but is not surfaced).
- No team composition settings.
- No cinematic camera.
- No automatic quality scaling/time dilation.

## Validation

```bash
npx vitest tests/spawn-system.spec.ts
npx vitest tests/captain-election.spec.ts
npx vitest tests/runtime/matchStateMachine.spec.ts
npx vitest tests/runtime/battleRunner.spec.ts
npx vitest tests/ui/AppShortcuts.test.tsx
```
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
2.a Run repository file-size scan for `src/` and identify files >300 LOC
   → If any found: attach findings to the plan and create a refactor plan per FR-011
   → Create tracked tasks for at least the first refactor step (2–4 hour chunk)
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

Deliver the full spec-defined player UI and match flow for the 3D team-vs-team autobattler. Build on the existing React + react-three-fiber + Miniplex + Rapier foundation to ship a production-ready HUD, overlays, stats surfaces, and restart/settings loop that satisfy FR-006 through FR-023 while honoring constitutional constraints (TDD-first, ≤300 LOC modules, rendering separated from simulation). Focus on a state-driven, test-first UI architecture that derives data from ECS selectors, stores view state in Zustand, and exercises every flow—from live battle status to victory countdown, stats modal, and quality-scaling feedback—through automated tests.

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

**FR-011 / File-size enforcement**:
- As part of the plan execution the implementer MUST run an automated file-size scan
   (for example using `wc -l` or a linting rule) across `src/` and include the
   results in the plan artifacts. Any `src/` file identified with >300 LOC MUST have
   a short refactor plan attached (see Constitution III) and one or more tracked
   tasks created. This behavior implements FR-011 from the feature spec and ensures
   the repository sizing constraint is enforced during design and implementation.

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
├── App.tsx                         # Root composition + UI wiring
├── index.css                       # Baseline styles
├── styles/
│   ├── hud.css                     # HUD layout & typography
│   └── overlays.css                # Victory/stats/performance visuals
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
├── selectors/
│   └── uiSelectors.ts              # Derived data for HUD & overlays
├── store/
│   └── uiStore.ts                  # Zustand store for UI state
├── hooks/
│   ├── useBattleHudData.ts         # Compose selectors for HUD
│   ├── useVictoryCountdown.ts      # Countdown lifecycle management
│   ├── useUiShortcuts.ts           # Keyboard/controller bindings
│   ├── useCameraControls.ts        # Mouse/keyboard camera controls
│   ├── useTouchControls.ts         # Touch/pinch camera controls
│   ├── useCinematicMode.ts         # Auto-follow camera mode
│   ├── usePhysicsSync.ts           # Sync ECS ↔ Rapier positions
│   ├── usePerformanceMonitor.ts    # FPS tracking & quality scaling
│   └── usePostBattleStats.ts       # Snapshot stats for modal
├── components/
│   ├── scene/
│   │   ├── Arena.tsx               # Space-station environment renderer
│   │   ├── Robot.tsx               # Robot mesh & visual state
│   │   ├── Weapon.tsx              # Weapon visual effects
│   │   ├── Projectile.tsx          # Projectile trail & impact effects
│   │   └── Lighting.tsx            # Directional & ambient lights
│   ├── hud/
│   │   ├── HudRoot.tsx             # HUD container + layout
│   │   ├── TeamStatusPanel.tsx     # Team counts & captain markers
│   │   ├── BattleTimer.tsx         # Elapsed time + countdown indicator
│   │   └── ControlStrip.tsx        # Pause, cinematic, overlay toggles
│   ├── overlays/
│   │   ├── VictoryOverlay.tsx      # Victory screen with countdown
│   │   ├── StatsModal.tsx          # Post-battle statistics modal
│   │   ├── SettingsDrawer.tsx      # Team composition adjustments
│   │   └── PerformanceBanner.tsx   # Quality-scaling warning overlay
│   └── controls/
│       ├── OverlayToggleButton.tsx # Toggle HUD/overlays visibility
│       └── CinematicToggleButton.tsx # Shortcut button for camera mode
├── systems/
│   ├── performanceManager.ts       # Quality scaling & time dilation
│   ├── qualityScaler.ts            # Shadow/particle/draw distance adjustments
│   └── uiBridgeSystem.ts           # Sync SimulationState/performance stats to UI store
├── utils/
│   ├── meshGenerators.ts           # Procedural robot/weapon meshes
│   ├── damageCalculator.ts         # Rock-paper-scissors damage logic
│   └── teamColorMapper.ts          # Red/blue material assignments

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
│   ├── stats-tracking.test.ts      # FR-019 validation
│   └── ui/
│       ├── victory-overlay.test.ts # FR-006 auto-restart UI
│       ├── stats-modal.test.ts     # FR-019 metrics surfacing
│       └── performance-banner.test.ts # FR-021-023 warnings
└── unit/
    ├── damageCalculator.test.ts    # Rock-paper-scissors logic
    ├── qualityScaler.test.ts       # Performance scaling
    ├── uiStore.test.ts             # Zustand store behavior
    └── uiSelectors.test.ts         # Derived data correctness

playwright/tests/
├── e2e-simulation.spec.ts          # Full battle flow validation
└── ui-flow.spec.ts                 # Victory → stats → restart loop
```

### UI Flow Implementation Strategy

- **Primary UI states**: `SimulationState.status` drives core states (initializing, running, paused, victory, simultaneous-elimination). A dedicated Zustand `uiStore` layers view concerns on top (`isHudVisible`, `isStatsOpen`, `isSettingsOpen`, `isPerformanceBannerVisible`). This separation keeps render components declarative and satisfies Constitution Principle IV (rendering consumes state).
- **Data flow**: ECS emits authoritative data (robot counts, captains, performance metrics, post-battle stats). `selectors/uiSelectors.ts` converts raw ECS queries into memoized view models consumed by `useBattleHudData`, `usePostBattleStats`, and overlay components. UI-only state (modal visibility, countdown overrides) lives in `uiStore` to avoid polluting ECS systems.
- **HUD layout**: `HudRoot` anchors the top-left informational stack (match title, status text, team scoreboards, captain badges, elapsed time) while `ControlStrip` along the top-right exposes pause/reset, cinematic toggle (FR-013), overlay toggle, and settings access (FR-006). Components remain <300 LOC and compose via CSS grid defined in `styles/hud.css`.
- **Overlays & modals**: 
  - `VictoryOverlay` appears when `SimulationState.status === "victory"` and shows the countdown timer (FR-006) plus buttons for Stats and Settings. 
  - `StatsModal` renders in a portal with focus trap & escape handling, using aggregated metrics from `usePostBattleStats` to satisfy FR-019. 
  - `SettingsDrawer` slides from the side, allowing team composition tweaks before restarting (FR-006, FR-014). 
  - `PerformanceBanner` listens to `performanceStats.qualityScalingActive` and displays warnings with auto-hide logic (FR-021–FR-023).
- **Interactions**: `useUiShortcuts` binds keyboard/midi/touch gestures (Space = pause/resume, C = cinematic toggle, O = overlay toggle, Esc = close modals). Buttons dispatch actions to `uiStore`, while ECS systems (victory, stats, performance) dispatch store updates via a thin `uiBridgeSystem`.
- **Accessibility & responsiveness**: HUD and overlays use semantic landmarks (`role="status"`, `aria-live="polite"` for countdown updates). Stats modal traps focus, supports keyboard navigation, and respects `prefers-reduced-motion` by disabling animated transitions. CSS ensures readability on 1280×720 and tablet breakpoints.
- **Testing**: New Vitest + Testing Library suites assert HUD values, countdown transitions, and modal content. Playwright scenario `ui-flow.spec.ts` exercises the full loop (battle end → stats → settings → restart). All tests fail before implementation per Constitution Principle II.

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

> NOTE: Contracts are the canonical source for numeric rules and
> configuration values used by the feature. For example, the weapon base
> damage values and matchup multipliers are defined in
> `specs/001-3d-team-vs/contracts/scoring-contract.md`. Tests and
> implementations should reference the contract rather than hard-coding
> numbers in code or documentation.

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

*This section defines the UI & flow backlog that the /tasks command will emit. It assumes the core simulation systems from Phase 1 remain in place and focuses on FR-006 – FR-023 compliance.*

**Task Generation Strategy**:

**Gate 0 – UI Flow Tests (must fail first)**  
Tests are authored before any UI implementation to satisfy Constitution Principle II (Test-First):
- **T001**: Create `tests/integration/ui/victory-overlay.test.ts` to assert the victory countdown, winner banner, Stats button, Settings shortcut, and auto-restart trigger (FR-006, FR-014).
- **T002**: Create `tests/integration/ui/stats-modal.test.ts` validating post-battle metrics (per-robot stats, team aggregates, captain markers) rendering in `StatsModal` (FR-019, FR-020).
- **T003**: Create `tests/integration/ui/performance-banner.test.ts` verifying the quality-scaling warning overlay toggles when `performanceStats.qualityScalingActive` flips and that dismiss/auto-hide logic works (FR-021–FR-023).
- **T004**: Author unit tests `tests/unit/store/uiStore.test.ts` & `tests/unit/selectors/uiSelectors.test.ts` covering store actions (open/close modals, toggle HUD) and derived data (team counts, captain display, countdown formatting).
- **T005**: Author integration test `tests/integration/simulation/physics-step.test.tsx` mounting `Simulation` with a stub frame hook to confirm `stepSimulation` runs every frame (FR-012, Constitution Principle IV).

**Gate 1 – Data & State Preparation**
Build the data plumbing that UI components will consume:
- **T006**: Implement `src/store/uiStore.ts` with Zustand slices for HUD visibility, modal state, countdown overrides, and performance banner flags (≤200 LOC).
- **T007**: Implement `src/selectors/uiSelectors.ts` to convert ECS queries into memoized view models (team tallies, captain info, performance KPIs) (≤220 LOC).
- **T008**: Implement `src/hooks/useBattleHudData.ts` consuming selectors and store to provide a typed HUD DTO (status text, team summaries, controls state).
- **T009**: Implement `src/hooks/usePostBattleStats.ts` assembling the dataset required by `StatsModal`, including per-robot rows sorted by kills/damage.

**Gate 2 – HUD Composition**
Render the always-on HUD shell once data hooks exist:
- **T010**: Build `src/components/hud/HudRoot.tsx` to compose the HUD layout, wiring `role="banner"` landmarks and responsive positioning (≤180 LOC).
- **T011**: Build `src/components/hud/TeamStatusPanel.tsx` for each team’s counts, captain badge, weapon distribution chips, and alive/eliminated display (≤160 LOC).
- **T012**: Build `src/components/hud/BattleTimer.tsx` showing elapsed time and, when active, the victory countdown overlaying the timer (≤120 LOC).
- **T013**: Build `src/components/hud/ControlStrip.tsx` exposing pause/resume, cinematic toggle, overlay toggle, and settings button (dispatches store actions) (≤200 LOC).

**Gate 3 – Overlays & Modals**
Implement the pop-up flows triggered by battle events:
- **T014**: Build `src/components/overlays/VictoryOverlay.tsx` with countdown, winner messaging, Stats + Settings buttons, and manual restart control (FR-006, FR-014).
- **T015**: Build `src/components/overlays/StatsModal.tsx` with focus trap, sortable tables, and summary cards sourced from `usePostBattleStats` (FR-019).
- **T016**: Build `src/components/overlays/SettingsDrawer.tsx` allowing team composition tweaks (weapon distribution sliders, save/apply actions), persisting choices to UI store (FR-006).
- **T017**: Build `src/components/overlays/PerformanceBanner.tsx` showing FPS, scaling state, dismiss control, and auto-hide animation (FR-021–FR-023).

**Gate 4 – Interaction & Integration**
Connect UI to runtime state and inputs:
- **T018**: Wire `src/components/Simulation.tsx` to invoke `usePhysicsSync`, supporting optional frame hook injection for deterministic testing and ensuring simulation advances independently of rendering (FR-012).
- **T019**: Implement `src/hooks/useVictoryCountdown.ts` to bridge `SimulationState`, manage the 5-second countdown, and dispatch restart/reset intents (FR-006, FR-014).
- **T020**: Implement `src/hooks/useUiShortcuts.ts` handling keyboard/gamepad bindings (Space pause, C cinematic, O overlay toggle, Esc close modals) with cleanup (FR-013, FR-006).
- **T021**: Implement `src/systems/uiBridgeSystem.ts` (Miniplex system) to observe simulation/performance stats each frame and update the UI store without coupling render components to ECS (≤200 LOC).
- **T022**: Integrate HUD + overlays into `src/App.tsx`, wire store providers, ensure victory & stats systems trigger store actions, and update `quickstart.md` instructions to reference new controls.

**Gate 5 – Styling & Accessibility**
- **T023**: Author `src/styles/hud.css` and `src/styles/overlays.css`, ensuring responsive layout, accessible contrast, motion preferences, and captain indicators (≤200 LOC combined).

**Gate 6 – End-to-End Verification**
- **T024**: Add Playwright scenario `playwright/tests/ui-flow.spec.ts` covering battle completion → victory overlay → stats modal → settings adjustment → restart loop (FR-006, FR-019, FR-014).

**Ordering Strategy**:
- Gate 0 tasks (T001–T005) run first and must fail until later gates deliver implementations.
- Gate 1 (T006–T009) establishes data plumbing; components may not begin until selectors/hooks exist.
- Gate 2 (T010–T013) can run in parallel per component once data hooks compile.
- Gate 3 (T014–T017) depends on Gate 1 hooks; T015 waits for `usePostBattleStats` (T009).
- Gate 4 (T018–T022) depends on overlay/HUD components existing and physics sync wiring ready.
- Gate 5 (T023) styles rely on component markup.
- Gate 6 (T024) runs last after UI wiring is stable.

**Dependencies**:
```
Tests (T001-T005) → Data & Hooks (T006-T009) → HUD (T010-T013) → Overlays (T014-T017) → Integration (T018-T022) → Styling (T023) → E2E (T024)

TDD Gate: T001-T005 MUST fail before T006+ begins.
```

**Parallelization Examples**:
- After T009, T010–T013 (HUD components) can be developed concurrently (distinct files).
- After T017, T019 and T020 can progress in parallel (independent hooks) before converging at T021/T022.
- Styling (T023) can overlap with T022 once component markup is stable.

**Constitutional Compliance**:
- Every task references a concrete path under `src/` or `tests/`.
- Estimated LOC per file stays ≤300; large features are decomposed into multiple modules.
- TDD enforced via Gate 0; integration/E2E coverage ensures FR-006–FR-023 validation.
- `uiBridgeSystem` keeps rendering pure by pushing side-effects into ECS systems per Principle IV.

### Scaffolding requirement (important for TDD and test execution)

Ensure the existing scaffold (`src/main.tsx`, `src/App.tsx`, `src/index.css`, minimal Canvas scene) remains in place so new UI tests can mount the app. Before running the new UI integration suites, confirm:

- `npm run dev` renders the Canvas plus HUD root container without runtime errors.
- `App.tsx` exports a React component with `#status` placeholder (will be replaced during T022).

Scaffolding is a prerequisite for Gate 0 tests; do not remove or regress it while implementing the new UI flows.

## FR-011 File-size enforcement (plan artifact)

In addition to the steps above, the plan MUST include an explicit file-size
scan and tracked refactor tasks for any `src/` file exceeding 300 LOC. This is
required by FR-011 and the Constitution (Size & Separation Limits). Minimum
plan artifacts to produce when oversized files are detected:

- `filesize-scan.txt` — raw output of the scan showing file paths and line counts.
- `refactor-plan-<file>.md` — a one-page refactor plan for each oversized file
   describing proposed module splits, the public API for extracted modules, and
   which unit tests will be added before migration.
- `tasks.md` updates — add one or more tracked tasks (2–4 hour chunks) per file
   to this feature's `tasks.md`, with the first task marked `in_progress` when work
   starts.

Recommended scan command (bash):

```bash
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 | xargs -0 wc -l | awk '$1 > 300 { print $0 }' > specs/003-extend-placeholder-create/filesize-scan.txt
```

Follow the constitution guidance: prefer extracting pure helpers and utilities
first (low risk), add tests for extracted code, and use a thin re-exporting facade
in the original file during migration to keep call-sites stable.

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
- [x] Phase 3: Tasks generated (/tasks command) - tasks.md enumerates 22 UI-flow tasks
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
- ✅ tasks.md (24 UI-centric tasks with Gate-based ordering)

**Next Steps**:
1. Write the new UI tests (T001-T005) and confirm they fail.
2. Deliver data plumbing hooks/store (T006-T009).
3. Build HUD components (T010-T013) observing LOC limits.
4. Implement overlays and modals (T014-T017) with focus management.
5. Wire physics sync, countdown, shortcuts, and ECS bridge (T018-T022) then apply styles (T023).
6. Run Playwright `ui-flow.spec.ts` (T024) and update CONSTITUTION-CHECK before PR.

---
*Based on Constitution v1.0.1 - See `.specify/memory/constitution.md`*
