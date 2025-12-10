---
title: "Tasks — Dynamic Arena Obstacles (006)"
---

# Tasks: Dynamic Arena Obstacles (006)

**Input**: `specs/006-dynamic-arena-obstacles/spec.md` and `plan.md` (Phase 0–2)

**Prerequisites**: `plan.md` and `spec.md` exist. Foundational tasks (Phase 2) block story work.

---

## Phase 1: Setup (Shared infra & scaffolding)

Purpose: Create types, fixtures and test harness updates required to implement dynamic obstacles.

- [x] T001 [P] Create ECS component types for dynamic obstacles
  - Files: `src/ecs/components/dynamicObstacle.ts`, `src/ecs/components/movementPattern.ts`,
    `src/ecs/components/hazardZone.ts`, `src/ecs/components/destructibleCover.ts`
  - Outcome: Type-only files that export canonical structures matching `data-model.md`.

- [x] T002 [P] Add debug fixture and example authoring JSON
  - File: `specs/fixtures/dynamic-arena-sample.json`
  - Outcome: Example obstacles (moving barrier, hazard, destructible cover) which can be loaded by tests and editor.

- [x] T003 [P] Extend test harness to support obstacle fixtures and Rapier mock
  - Files: `tests/setup.ts`, add helpers under `tests/helpers/obstacleFixtures.ts`
  - Outcome: Unit tests can load obstacle fixtures deterministically without a real Rapier instance.

---

## Phase 2: Foundational (Blocking — must finish before user stories)

Purpose: Implement deterministic runtime behaviour (movement, runtime LOS, hazard schedules, destruction) and expose test hooks.

 - [x] T004 [P] Add rotation & oscillation movement patterns to movement system
  - Files: `src/simulation/obstacles/movementSystem.ts`, tests: `tests/simulation/obstaclesMovementRotation.spec.ts`
  - Outcome: Movement patterns support `rotation` and `oscillate` and are deterministic on tick stepping.

 - [x] T005 [P] Sync obstacle transforms into Rapier as kinematic colliders when rapier world present
  - Files: `src/simulation/obstacles/rapierIntegration.ts`, update `battleRunner`/world Rapier binding
  - Outcome: Rapier world has kinematic colliders for obstacles so raycasts and physics queries see runtime geometry.

 - [x] T006 [P] Support Rapier-backed LOS checks and keep static fallback
  - Files: `src/simulation/environment/arenaGeometry.ts`, tests: `tests/simulation/arenaGeometryRapier.spec.ts`
  - Outcome: `isLineOfSightBlockedRuntime` prefers Rapier raycasts when `rapierWorld` available; falls back to fast geometry checks.

 - [x] T007 [P] Integrate destructible cover into projectile/combat pipeline
  - Files: `src/ecs/systems/projectileSystem.ts`, `src/simulation/obstacles/destructibleSystem.ts`, tests: `tests/simulation/projectileCoverInteraction.spec.ts`
  - Outcome: Projectile impacts reduce cover durability, emit `cover:damaged`/`cover:destroyed` events and update LOS/pathing.

- [x] T008 [P] Extend hazard system to apply slow/status effects (in addition to damage)
  - Files: `src/simulation/obstacles/hazardSystem.ts`, tests: `tests/simulation/hazardSlow.spec.ts`
  - Outcome: Hazard schedule supports damage and slow/status effects with deterministic timing.

 - [x] T009 [P] Instrument telemetry for obstacle lifecycle events
  - Files: `src/runtime/simulation/ports.ts`, `src/runtime/simulation/telemetry/obstacleTelemetry.ts`, tests: `tests/simulation/telemetry.obstacles.spec.ts`
  - Outcome: `obstacle:move`, `hazard:activate`, `hazard:deactivate`, and `cover:destroyed` events are recorded with `frameIndex` and `timestampMs`.

**Checkpoint**: After Phase 2, simulation supports runtime obstacles, deterministic movement, LOS, hazards and destruction.

---

## Phase 3: User Story 1 - Player Experience (Priority: P1) 🎯 MVP

Goal: Players experience moving barriers, timed hazards and destructible cover in matches.

Independent Test: Headless integration verifying a moving barrier blocks LOS and that units cannot shoot through it.

### Tests

- [x] T010 [US1] [P] Add integration test: moving barrier blocks LOS and projectiles
  - File: `tests/integration/movingBarrierBlock.spec.ts`
  - Verify: a projectile fired across a barrier is blocked while barrier intersects the shot path; recorded via telemetry.

- [x] T011 [US1] [P] Add integration test: hazard active window applies effects to units inside
  - File: `tests/integration/hazardWindow.spec.ts`
  - Verify: unit inside hazard receives damage/slow only during active windows.

### Implementation

- [x] T012 [US1] [P] Add obstacle spawn from fixture into match start flow
  - File: `src/simulation/match/matchSpawner.ts` (or spawnTeams placement), tests/integration
  - Outcome: Matches can be seeded with obstacles defined in fixture JSON.

- [x] T013 [US1] [P] Add runtime demo / debug UI for manual playtesting
  - File: `src/components/debug/ObstacleSpawner.tsx` and register in dev view
  - Outcome: Designers/testers can place and manipulate obstacles at runtime in dev server.

- [x] T014 [US1] Add MatchTrace verification test for obstacle events
  - File: `tests/integration/matchTrace.obstacles.spec.ts`
  - Verify: MatchTrace contains obstacle move/activation/destroy events with deterministic ordering.

Checkpoint: US1 can be validated end-to-end against integration tests.

---

## Phase 4: User Story 2 - Designer / Level Authoring (Priority: P2)

Goal: Designers can place and configure dynamic obstacles via fixtures and editor controls.

Independent Test: Developer loads sample fixture, modifies obstacle parameters, and sees corresponding runtime behaviour.

- [x] T015 [US2] [P] Add Obstacle Inspector UI for authoring obstacle parameters
  - Files: `src/ui/inspector/ObstacleInspector.tsx`, `src/components/debug/ObstacleEditor.tsx`
  - Outcome: Designer can edit movement pattern, hazard schedule, durability in-the-browser.

- [x] T016 [US2] [P] Add fixture load/save integration for the editor
  - Files: `src/ui/fixtureLoader.ts`, `specs/fixtures/dynamic-arena-sample.json`
  - Outcome: Editor can load/save obstacle configurations used by match spawner.

- [ ] T017 [US2] [P] Playwright E2E: verify editor changes affect runtime obstacle behaviour
  - File: `playwright/tests/obstacle-editor.spec.ts`
  - Verify: change movement params → runtime motion changes in dev server preview.

---

## Phase 5: User Story 3 - AI / Pathfinding & Reliability (Priority: P3)

Goal: AI correctly treats dynamic obstacles as changing constraints and reroutes or falls back.

Independent Test: Headless match where a barrier moves to block the planned path and AI reroutes within bounded time.

- [x] T018 [US3] Add integration test: AI reroutes when path becomes blocked
  - File: `tests/integration/ai-reroute.spec.ts`
  - Verify: AI recomputes a new route within `<= 3` ticks or executes a fallback behaviour.

- [x] T019 [US3] Implement re-evaluation & pathfinder hook for dynamic obstacles
  - Files: `src/simulation/ai/pathing/*` (planner adjustments or service), tests/integration
  - Outcome: AI will not remain permanently stuck — chooses alternate route or fallback.

- [x] T020 [US3] Add deadlock detection integration test (multi-obstacle timing)
  - File: `tests/integration/ai-deadlock.spec.ts`
  - Verify: Scenes that temporarily trap robots resolve or trigger fallback, avoiding permanent deadlocks.

---

## Phase 6: Performance, Visuals & Validation (Parallellizable)

- [x] T021 [P] Add placeholder obstacle visuals and wire to existing render pipeline
  - Files: `src/visuals/ObstacleVisual.tsx`, `src/components/Simulation.tsx`
  - Outcome: Visual debugging for obstacles; can be toggled off for perf tests.

- [x] T022 [P] Add headless performance stress test for 50 active obstacles
  - Files: `tests/stress/obstacles.stress.spec.ts`, `scripts/perf/obstacle-stress.js`
  - Verify: baseline comparison vs main branch shows no more than 20% performance regression (adjust per baseline).

- [x] T023 [P] Add debug toggles & QualityManager controls for obstacle stress testing
  - Files: `src/state/quality/QualityManager.ts`, `src/components/debug/PerfToggles.tsx`

---

## Final Phase: Polish, Docs & PR

- [ ] T024 [P] Update spec docs, quickstart and fixtures with final instructions
  - Files: `specs/006-dynamic-arena-obstacles/spec.md`, `quickstart.md`, `specs/fixtures/` updates

- [ ] T025 [P] Create PR, add `CONSTITUTION-CHECK` notes, test run summary and a short exec summary
  - Files: PR description + `specs/006-dynamic-arena-obstacles/` artifacts

---

## Dependencies & Execution Order

- Phase 1 (Setup) tasks are parallelizable and can run concurrently (T001..T003).
- Phase 2 (Foundational) tasks must complete before story work begins (T004..T009). These are blocking.
- User stories (Phase 3..5) can be implemented in parallel once foundational tasks complete, but MVP should focus on US1.
- Performance/visuals & polish tasks can be executed in parallel by separate engineers.

---

## Metrics & MVP

- Total tasks: 25 (T001..T025)
- Tasks per user story:
  - US1 (Player Experience): 5 tasks (T010..T014)
  - US2 (Designer Authoring): 3 tasks (T015..T017)
  - US3 (AI/Pathfinding): 3 tasks (T018..T020)
- Parallel opportunities: Many (T001/T002/T003), core foundational tasks are [P]. Visuals and perf tasks are independent.
- Independent test criteria: included above under each story (integration tests enumerated).
- Suggested MVP: complete Phase 1 + Phase 2, then deliver US1 (T010..T014) and validate in CI before moving to US2/US3.

---

All tasks follow the required checklist format: each line starts with `- [ ] T###` and includes an exact file path.
