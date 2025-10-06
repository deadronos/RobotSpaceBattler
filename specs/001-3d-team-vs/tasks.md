# Tasks: 3D Team vs Team Autobattler Game Simulation

**Input**: Design documents from `/specs/001-3d-team-vs/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow
```
1. Load plan.md from feature directory → Extract tech stack, libraries, structure
2. Load design documents:
   → data-model.md: 6 entities (Robot, Weapon, Projectile, Team, Arena, SimulationState)
   → contracts/: 2 contract files (spawn, weapon balance)
   → research.md: 10 technical decisions
   → quickstart.md: 6 test scenarios
3. Generate tasks by category:
   → Setup: project init, dependencies, linting, constitution checks
   → Tests: 3 contract tests + 4 integration tests (TDD - must fail first)
   → Core: 6 entity models + 8 systems + 3 hooks
   → Rendering: 6 r3f components + 2 UI components
   → Integration: physics sync, performance monitoring
   → Polish: unit tests, performance optimization, documentation
4. Task ordering:
   → Setup before everything
   → Tests before implementation (TDD)
   → Entity models before systems
   → Systems before rendering components
   → Core before integration
   → Everything before polish
5. Total tasks: 38 numbered tasks (T001-T038)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Single-project structure (per plan.md):
- Source: `src/` at repository root
- Tests: `tests/` at repository root
- E2E: `playwright/tests/`

---

## Phase 3.1: Setup (7 tasks)

- [x] T001 Create project structure with directories: `src/ecs/entities/`, `src/ecs/systems/`, `src/components/`, `src/hooks/`, `src/utils/`, `tests/contracts/`, `tests/integration/`, `tests/unit/`
  
   Supports: Constitution Principles II (Test-First), III (Size & Separation), IV (React & r3f Best Practices). This infra ensures project layout required for TDD and small-file separation.

- [x] T002 Install TypeScript 5.x + React 19+ dependencies: `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `miniplex`, `zustand`, `@react-three/postprocessing`, `@react-three/gltfjsx`, configure `vite.config.ts` for r3f
  
   Supports: Constitution Principles IV (r3f best practices) and VI (Dependency Hygiene). Provides the runtime and library baseline required by the feature and tests.

- [x] T003 [P] Configure ESLint and Prettier with TypeScript + React rules, update `eslint.config.cjs` and `prettierrc.txt`

   Supports: Constitution Principles III (Size & Separation) and II (Test-First) indirectly by keeping code consistent and reviewable. Ensures code style gates for PRs.

- [x] T004 [P] Add Constitution Compliance checklist validation to GitHub Actions workflow `.github/workflows/ci.yml` to verify PR contains `CONSTITUTION-CHECK` section

   Supports: Constitution Governance (PR-level compliance). Directly enforces Constitution rule that every PR must include a `CONSTITUTION-CHECK` with TDD evidence and file-size assertions.

- [x] T005 [P] Add automated source-size check to CI: fail build if any new/modified source file in `src/` exceeds 300 LOC without approved exception

   Supports: Constitution Principle III (Size & Separation). Implements the file-size enforcement described by the constitution and prevents accidental large files.

- [x] T006 [P] Create code-health task script in `scripts/check-code-health.ts` to detect duplicate modules and generate deprecation plan per constitution

   Supports: Constitution Principle VI (Deprecation & Dependency Hygiene) and I (Component & Library-First) by automating redundancy detection and suggested deprecations.

- [x] T007 [P] Add global TypeScript types in `src/types/index.ts` for Vector3, Quaternion, Team, WeaponType, AIState, RobotStats

   Supports: Constitution Principles I (Component & Library-First) and IV (r3f Best Practices). Types reduce ambiguity across entities, tests, and systems and speed contract test authoring.

### Scaffolding (MANDATORY - must exist before running UI/integration tests)

- [x] S001 Create minimal app entry files (required files):
  - `src/main.tsx` — mounts React root and imports `App`. Should be small (≤ 60 LOC) and include a placeholder hook/comment for `resetAndSpawnDefaultTeams()` so the ECS bootstrap is discoverable.
  - `src/App.tsx` — root React component that renders the main `Scene` component and basic UI placeholders (status text, pause button). Export default `App`.
  - `src/index.css` — basic global CSS (sets html/body/#root full height and default background).
  - Acceptance: `npm run dev` must start the dev server and the Playwright smoke test (`playwright/tests/smoke.spec.ts`) should be able to connect and look for a `canvas` or `#status` element (tests may still assert failing game logic, but the app must mount successfully).

- [x] S002 Create minimal rendering placeholders:
  - `src/components/Scene.tsx` — renders a `<Canvas>` from `@react-three/fiber` and includes `Suspense`+`OrbitControls` placeholders.
  - `src/components/Simulation.tsx` — minimal simulation component that mounts inside the Canvas and provides a placeholder robot render (or `Html` fallback) allowing tests to find a canvas element.
  - Acceptance: Playwright and unit tests that render `App` can find a `<canvas>` element and basic status text.

- [x] S003 Minimal ECS wiring and robot placeholder:
  - `src/ecs/world.ts` — export a minimal `createWorld()` / `world` singleton or stub that downstream systems/components can import (keeps file under 300 LOC).
  - `src/robots/RobotFactory.tsx` or `src/components/RobotPlaceholder.tsx` — a tiny procedural robot mesh or box geometry used for the MVP.
  - Acceptance: project compiles; `App` imports do not error and simple rendering of robot placeholder succeeds.

Notes:
- These scaffolding tasks are intentionally small and should be implemented before attempting to run integration tests that expect a running UI. They do not implement game rules — they only provide a runnable app shell so tests can properly mount and fail on game logic rather than on missing entrypoints.
- Mark each scaffolding task 'completed' as soon as the file exists and the app mounts (even if contract/integration tests still fail for intended reasons). These tasks are prerequisites for the TDD gate and should be checked before writing tests that expect a mounted app.

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (3 tasks)

- [x] T008 [P] Contract test for robot spawning (FR-001) in `tests/contracts/robot-spawning.test.ts`: verify exactly 10 red robots, 10 blue robots, one captain per team, designated spawn zones, no position overlaps, balanced weapon distribution, all robots start with 100 health. Reference canonical spawn rules in `specs/001-3d-team-vs/contracts/spawn-contract.md`.

- [x] T009 [P] Contract test for weapon balance (FR-003) in `tests/contracts/weapon-balance.test.ts`:
   - Verify all 9 matchup scenarios and damage calculations per `contracts/scoring-contract.md`.
   - Ensure no zero/negative damage.

- [x] T010 [P] Contract test for camera system (FR-013) in `tests/contracts/camera-system.test.ts`: verify hybrid camera requirements per plan: free camera controls (mouse/keyboard), touch controls (pinch/drag), cinematic auto-follow mode, smooth transitions (no snapping), camera bounds (no leaving arena or penetrating obstacles), configurable smoothing parameters, and correct toggling between control modes. Ensure the camera does not cause visual artifacts or desync with ECS state.

### Integration Tests (4 tasks)

- [x] T011 [P] Integration test for AI behavior (FR-002) in `tests/integration/ai-behavior.test.ts`: verify autonomous target selection, movement toward enemies, weapon firing in range, cover-seeking when damaged, low-health retreat, captain coordination, formation maintenance, priority target calls, adaptive strategy switching

- [x] T012 [P] Integration test for victory flow (FR-006) in `tests/integration/victory-flow.test.ts`: verify team elimination detection, victory screen display with winner, 5-second countdown timer, pause/reset countdown controls, stats button opens post-battle metrics, settings button allows team composition changes, auto-restart after countdown

- [x] T013 [P] Integration test for physics sync (FR-012) in `tests/integration/physics-sync.test.ts`: verify ECS positions sync with Rapier physics every frame, projectile trajectories follow physics, collisions trigger damage events, eliminated robots removed from physics world, no rendering/physics desync

- [x] T014 [P] Integration test for performance (FR-010, FR-021-023) in `tests/integration/performance.test.ts`: verify 60 fps maintained with 20 robots + shadows, quality scaling activates below 30 fps, shadows disabled when quality scaling active, time scale reduces when FPS critically low, warning overlay displays, user can disable auto-scaling

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Entity Models (6 tasks - can parallelize)

- [x] T015 [P] Robot entity model in `src/ecs/entities/Robot.ts`: define Robot archetype with id, team, position, rotation, velocity, health, maxHealth, weaponType, isCaptain, aiState (behaviorMode, targetId, coverPosition, lastFireTime, formationOffset), stats (kills, damageDealt, damageTaken, timeAlive, shotsFired). Validate health bounds, team values, captain uniqueness. Export type and validation functions. (~120 LOC)

- [x] T016 [P] Weapon entity model in `src/ecs/entities/Weapon.ts`: define Weapon config with type, baseDamage, fireRate, projectileSpeed, effectiveRange, visualEffect. Include type-specific properties table and damage multiplier matrix (rock-paper-scissors). Export WeaponConfig type and getDamageMultiplier() function. (~80 LOC)

- [x] T017 [P] Projectile entity model in `src/ecs/entities/Projectile.ts`: define Projectile archetype with id, ownerId, weaponType, position, velocity, damage, distanceTraveled, maxDistance, spawnTime, maxLifetime. Include despawn condition checks. Export type and shouldDespawn() function. (~90 LOC)

- [x] T018 [P] Team entity model in `src/ecs/entities/Team.ts`: define Team archetype with name, activeRobots, eliminatedRobots, captainId, spawnZone (center, radius, spawnPoints), aggregateStats (totalKills, totalDamageDealt, totalDamageTaken, averageHealthRemaining, weaponDistribution). Export type and victory condition check. (~110 LOC)

- [x] T019 [P] Arena entity model in `src/ecs/entities/Arena.ts`: define Arena config with id, dimensions, spawnZones (2 zones with 10 spawn points each), obstacles (position, dimensions, isCover), lightingConfig (ambient/directional colors, intensities, shadow settings), boundaries. Export ArenaConfig type and spawn zone definitions. (~100 LOC)

- [x] T020 [P] SimulationState entity model in `src/ecs/entities/SimulationState.ts`: define SimulationState with status (initializing|running|paused|victory|simultaneous-elimination), winner, frameTime, totalFrames, simulationTime, timeScale, victoryScreenStartTime, autoRestartCountdown, performanceStats (currentFPS, averageFPS, qualityScalingActive). Export type and state transition helpers. (~130 LOC)

### ECS Systems (8 tasks - sequential dependencies)

- [x] T021 Initialize Miniplex ECS world in `src/ecs/world.ts`: create world instance, register entity archetypes, export world singleton and React context provider. Import entity types from T014-T019. (~100 LOC)

- [x] T022 Spawn system in `src/ecs/systems/spawnSystem.ts`: implement robot spawning logic per `specs/001-3d-team-vs/contracts/spawn-contract.md`: allocate 10 spawn points per team, create 20 Robot entities with team assignment, balanced weapon distribution, captain election, initialize physics bodies. Use Team and Arena entities. Depends on T014, T017, T018, T020. (~180 LOC)

- [x] T023 [P] Weapon system in `src/ecs/systems/weaponSystem.ts`: implement fireWeapon() to create Projectile entities, check fireRate cooldown, calculate damage with multipliers from Weapon model, update Robot.stats.shotsFired. Query active robots, update lastFireTime. Depends on T014, T015, T016, T020. (~150 LOC)

- [x] T024 [P] Damage system in `src/ecs/systems/damageSystem.ts`: handle projectile-robot collisions, apply damage to Robot.health, update stats (kills, damageDealt, damageTaken), remove eliminated robots from physics, trigger captain re-election if captain dies. Query projectiles and robots. Depends on T014, T016, T020. (~190 LOC)

- [x] T025 AI system - Individual behavior in `src/ecs/systems/ai/individualAI.ts`: implement target selection (prioritize rock-paper-scissors advantage), movement toward enemies, cover-seeking when damaged (<30 health), peek-and-shoot, low-health retreat. Query enemy robots, update aiState.behaviorMode/targetId/coverPosition. Depends on T014, T015, T020. (~200 LOC)

- [x] T026 AI system - Captain coordination in `src/ecs/systems/ai/captainAI.ts`: implement formation maintenance (formationOffset for non-captains), priority target calling (aiState.targetId override), captain reassignment on death (elect highest health robot). Query captains and team members. Depends on T014, T017, T020, T024. (~180 LOC)

- [x] T027 AI system - Adaptive strategy in `src/ecs/systems/ai/adaptiveStrategy.ts`: implement behavior switching based on health (<50 = defensive, >70 = aggressive), team advantage (active robot count ratio), adjust formation spacing. Query team stats. Depends on T014, T017, T020, T024, T025. (~150 LOC)

- [x] T028 Victory system in `src/ecs/systems/victorySystem.ts`: detect team elimination (Team.activeRobots = 0), update SimulationState.status to "victory", set winner, start autoRestartCountdown at 5 seconds, handle simultaneous elimination (draw). Query teams and simulation state. Depends on T017, T019, T020. (~130 LOC)

- [x] T029 [P] Robot rendering component in `src/components/Robot.tsx`: render procedural robot mesh (THREE.BoxGeometry for MVP), apply team color material, display health bar (floating above robot), captain visual indicator (glow/outline), sync position/rotation from ECS. Use useFrame for interpolation only. Depends on T014, T020. (~150 LOC)

- [x] T030 [P] Projectile rendering component in `src/components/Projectile.tsx`: render projectile based on weaponType (beam for laser, tracer for gun, exhaust for rocket), apply visual effects, sync position from ECS. Use GPU instancing for multiple projectiles. Depends on T016, T020. (~120 LOC)

- [x] T031 [P] Arena rendering component in `src/components/Arena.tsx`: render space-station environment (procedural floor/walls), spawn zone markers, obstacles (cover boxes), setup directional + ambient lighting, configure shadows. Use Arena entity config. Depends on T018, T020. (~180 LOC)

- [x] T032 Camera system - Free camera hook in `src/hooks/useCameraControls.ts`: implement orbit controls (mouse drag), zoom (scroll wheel), pan (right-click drag), keyboard controls (arrow keys for rotate, W/S for zoom, A/D for strafe). Query arena for boundaries. Depends on T018, T020. (~150 LOC)

- [x] T033 Camera system - Touch controls hook in `src/hooks/useTouchControls.ts`: implement single finger drag (orbit), pinch-to-zoom, two-finger drag (pan). Integrate with useCameraControls for unified control state. Depends on T031. (~100 LOC)

- [x] T034 Camera system - Cinematic mode hook in `src/hooks/useCinematicMode.ts`: implement auto-follow combat hotspots (query robots with lowest health or highest damage), smooth camera transitions, toggleable mode (keyboard "C" or button). Query robots and calculate action centers. Depends on T014, T020, T031. (~120 LOC)

### UI Components (2 tasks)

- [x] T034 Victory screen component in `src/components/ui/VictoryScreen.tsx`: display winner (red/blue/draw), 5-second countdown timer, "Stats" button to open post-battle metrics modal, pause/reset countdown controls, settings icon for team composition changes. Use Zustand for UI state. Depends on T019, T020. (~140 LOC)

- [x] T035 Performance overlay component in `src/components/ui/PerformanceOverlay.tsx`: display FPS counter, warning message when quality scaling active, toggleable auto-scaling checkbox. Read SimulationState.performanceStats. Use Zustand for visibility toggle. Depends on T019, T020. (~90 LOC)

---

## Phase 3.5: Integration & Polish

### Integration (2 tasks)

- [x] T036 Physics sync integration in `src/systems/physicsSync.ts`: implement usePhysicsSync hook to read Rapier transform data and update ECS entity positions every frame, sync projectile trajectories, handle collision events (trigger damage system), remove physics bodies on entity despawn. Configure fixed timestep (60Hz). Depends on T014, T016, T020, T023. (~180 LOC)

- [x] T037 Performance management system in `src/systems/performanceManager.ts`: monitor FPS (rolling average), activate quality scaling below 30 fps (disable shadows, reduce particles, adjust draw distance), reduce timeScale when critically low FPS, update SimulationState.performanceStats, display warning overlay. Depends on T019, T020, T035. (~200 LOC)

- [ ] T038 Stats aggregation system in `src/ecs/systems/statsSystem.ts`: compute and persist per-robot (`RobotStats`) and per-team (`TeamStats`) metrics at the end of each match (victory or draw). Provide helpers to snapshot stats into `SimulationState.postBattleStats`, and ensure the victory UI (`T034`) can read a stable post-battle snapshot after entities are reset. Add unit tests in `tests/unit/systems/statsSystem.test.ts` and integration assertions in `tests/integration/victory-flow.test.ts`. Maps to: FR-019 (post-battle statistics).

  - Files: `src/ecs/systems/statsSystem.ts`, `src/ecs/entities/SimulationState.ts` (new `postBattleStats` field), `tests/unit/systems/statsSystem.test.ts`, `tests/integration/victory-flow.test.ts`
  - Acceptance: After a match ends, `SimulationState.postBattleStats` is defined with entries for both teams and all robots; the Victory UI can render metrics without querying live entities.

---

## Dependencies

**Critical Path**:
```
Setup (T001-T007) → Tests (T008-T013) → Entity Models (T014-T019) → ECS World (T020) →
Core Systems (T021-T027) → Rendering (T028-T035) → Integration (T036-T037) → Stats System (T038)
```

**Parallel Execution Groups**:
- **Group 1** (after T007): T008, T009, T010, T011, T012, T013 (all tests)
- **Group 2** (after T013): T014, T015, T016, T017, T018, T019 (all entity models)
- **Group 3** (after T020): T022, T024 (weapon + AI individual can run in parallel)
- **Group 4** (after T027): T028, T029, T030, T031 (rendering components)

**Blocking Dependencies**:
- T020 (ECS world) blocks T021-T027 (all systems need world)
- T021 (spawn) must complete before T022-T027 (other systems need spawned entities)
- T024 (individual AI) blocks T025 (captain AI) blocks T026 (adaptive AI)
- T031 (free camera) blocks T032 (touch controls) and T033 (cinematic mode)
- T023 (damage system) blocks T036 (physics sync needs collision handling)
- T035 (performance overlay) blocks T037 (performance manager needs UI)

---

## Parallel Execution Examples

### Example 1: All Tests in Parallel (after T007)
```bash
# Launch T008-T013 simultaneously (all different files):
npx vitest tests/contracts/robot-spawning.test.ts &
npx vitest tests/contracts/weapon-balance.test.ts &
npx vitest tests/integration/ai-behavior.test.ts &
npx vitest tests/integration/victory-flow.test.ts &
npx vitest tests/integration/physics-sync.test.ts &
npx vitest tests/integration/performance.test.ts &
wait
```

### Example 2: All Entity Models in Parallel (after T013)
```bash
# Launch T014-T019 simultaneously (all different files):
Task: "Robot entity model in src/ecs/entities/Robot.ts"
Task: "Weapon entity model in src/ecs/entities/Weapon.ts"
Task: "Projectile entity model in src/ecs/entities/Projectile.ts"
Task: "Team entity model in src/ecs/entities/Team.ts"
Task: "Arena entity model in src/ecs/entities/Arena.ts"
Task: "SimulationState entity model in src/ecs/entities/SimulationState.ts"
```

### Example 3: Rendering Components in Parallel (after T027)
```bash
# Launch T028-T031 simultaneously (all different files):
Task: "Robot rendering component in src/components/Robot.tsx"
Task: "Projectile rendering component in src/components/Projectile.tsx"
Task: "Arena rendering component in src/components/Arena.tsx"
Task: "Camera system - Free camera hook in src/hooks/useCameraControls.ts"
```

---

## Task Generation Rules

**Applied during generation**:

1. **From Contracts** (spawn-contract.md, scoring-contract.md):
   - spawn-contract.md → T008 (contract test)
   - scoring-contract.md → T009 (contract test)
   - Spawn logic → T021 (spawn system implementation)
   - Weapon balance logic → T022 (weapon system with multipliers)

2. **From Data Model** (6 entities):
   - Robot → T014 (model) + T028 (renderer)
   - Weapon → T015 (model) + used in T022 (system)
   - Projectile → T016 (model) + T029 (renderer)
   - Team → T017 (model) + T027 (victory system)
   - Arena → T018 (model) + T030 (renderer)
   - SimulationState → T019 (model) + T027, T037 (systems)

3. **From Quickstart** (6 test scenarios):
   - Test 1 (spawning) → T008 (contract test)
   - Test 2 (weapon balance) → T009 (contract test)
   - Test 3 (AI behavior) → T010 (integration test)
   - Test 4 (victory flow) → T011 (integration test)
   - Test 5 (physics sync) → T012 (integration test)
   - Test 6 (performance) → T013 (integration test)

4. **From Research** (10 technical decisions):
   - Decision 1 (Rapier3D physics) → T036 (physics sync)
   - Decision 2 (Miniplex ECS) → T020 (world initialization)
   - Decision 3 (Zustand UI state) → T034, T035 (UI components)
   - Decision 6 (Hybrid camera) → T031, T032, T033 (camera hooks)
   - Decision 8 (Three-layer AI) → T024, T025, T026 (AI systems)
   - Decision 7 (Performance) → T037 (performance manager)

5. **Ordering**:
   - Setup (T001-T007) before everything
   - Tests (T008-T013) before implementation (TDD)
   - Entity models (T014-T019) before systems (T021-T027)
   - ECS world (T020) before all systems
   - Core systems (T021-T027) before rendering (T028-T035)
   - Integration (T036-T037) last

---

## Validation Checklist

**GATE: Verify before considering tasks complete**

- [x] All contracts have corresponding tests (spawn → T008, weapon balance → T009)
- [x] All entities have model tasks (6 entities → T014-T019)
- [x] All test scenarios have integration tests (6 scenarios → T008-T013)
- [x] All tests come before implementation (T008-T013 before T014+)
- [x] Parallel tasks are truly independent (different files, verified)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitution compliance tasks included (T004, T005, T006)
- [x] File size constraints documented (LOC estimates per task)
- [x] TDD workflow enforced (Phase 3.2 before Phase 3.3)
- [x] All FR requirements mapped to tasks (FR-001 → T008/T021, FR-002 → T024-T026, FR-003 → T009/T022, etc.)

---

**Total Tasks**: 38
**Estimated Completion**: 5-7 sprints (assuming 5-8 tasks per sprint)
**Critical Tests**: 6 (must pass before feature considered complete)

**Status**: ✅ Tasks ready for execution via `/tasks` workflow
