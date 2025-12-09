---
title: "Tasks — Dynamic Arena Obstacles (006)"
---

# Tasks: Dynamic Arena Obstacles (006)

**Input**: `specs/006-dynamic-arena-obstacles/spec.md` and `plan.md` (Phase 0–2)

**Prerequisites**: Phase 0 research and Phase 1 design artifacts must be present. Blocking tasks are marked with `[P]`.

---

## Phase 1: Setup & Scaffolding

Purpose: Introduce component types, fixtures and test harness updates required by the feature.

- [ ] T001 [P] Add component type definitions for dynamic obstacles
  - Files: `src/ecs/components/dynamicObstacle.ts`, `src/ecs/components/movementPattern.ts`, `src/ecs/components/hazardZone.ts`, `src/ecs/components/destructibleCover.ts`
  - Acceptance: Type definitions exist and are covered by unit tests validating defaults and serialization.

- [ ] T002 [P] Test harness: ensure Rapier runtime mock support and obstacle fixtures
  - Files: `tests/fixtures/dynamic-arena-sample.json`, update `tests/setup.ts` if necessary
  - Acceptance: Unit tests can instantiate obstacles without a real Rapier world; a Rapier-aware path exists for integration tests.

---

## Phase 2: Core Systems (Blocking)

Purpose: Implement the core runtime behaviour required to make obstacles affect LOS and movement deterministically.

- [ ] T003 [P] Implement `movementSystem` for MovementPattern-driven motion
  - Files: `src/simulation/obstacles/movementSystem.ts`
  - Acceptance: Unit tests step the system and assert deterministic positions for linear and rotational patterns.

- [ ] T004 [P] Extend LOS checks to be runtime-aware
  - Files: `src/simulation/environment/arenaGeometry.ts` (extend function signatures or add runtime helper), and new `src/simulation/environment/runtime-geometry.ts` helper
  - Acceptance: Unit + integration tests demonstrate `isLineOfSightBlocked` can detect runtime obstacles when enabled and still work for static geometry.

- [ ] T005 [P] Implement `hazardSystem` with deterministic schedule processing
  - Files: `src/simulation/obstacles/hazardSystem.ts`
  - Acceptance: Unit tests ensure scheduled activation windows and effect application orders are deterministic.

- [ ] T006 [P] Implement `destructibleSystem` for cover durability and removal
  - Files: `src/simulation/obstacles/destructibleSystem.ts`
  - Acceptance: Tests confirm damage reduces durability and removal emits `cover:destroyed` event that updates LOS/pathing.

---

## Phase 3: AI & Pathfinding Integration

- [ ] T007 [P] Update AI sensors and avoidance systems to re-evaluate blocking at runtime
  - Files: `src/simulation/ai/sensors.ts`, `src/simulation/ai/pathing/*`
  - Acceptance: Integration test validates AI reroutes within 3 ticks or executes fallback behaviour when blocked.

- [ ] T008 [ ] Add integration tests verifying AI behavior under dynamic obstacles
  - Files: `tests/ai/pathing.dynamic.spec.ts` — scenarios: moving barrier blocks route; hazard zone forces route change or avoidance.

---

## Phase 4: Designer Tooling & Instrumentation

- [ ] T009 [ ] Expose obstacle authoring fixtures and editor bindings (non-blocking)
  - Files: `specs/fixtures/dynamic-arena-sample.json`, editor inspector hooks (if present)
  - Acceptance: Designers can load sample fixtures in dev server and see obstacles following patterns.

- [ ] T010 [ ] Emit telemetry/match trace events for critical obstacle events
  - Files: `src/telemetry/obstacles.ts` or integrate with existing telemetry aggregator
  - Acceptance: Tests assert `obstacle:move`, `hazard:activate/deactivate`, `cover:destroyed` events recorded with `frameIndex` and `timestampMs`.

---

## Phase 5: Performance & Validation

- [ ] T011 [ ] Add stress/perf tests for 50 active dynamic obstacles
  - Files: `tests/stress/obstacles.stress.spec.ts`
  - Acceptance: CI shows not less than 80% of baseline performance (baseline measured without obstacles) under comparable environment.

- [ ] T012 [ ] Final docs, quickstart and PR prep
  - Files: Update `specs/006-dynamic-arena-obstacles/quickstart.md` with any new commands and create PR with `CONSTITUTION-CHECK` and testing summary.

---

## Notes

- All tasks MUST follow TDD: add failing tests first describing the desired outcome then implement minimal code to turn green.  
- Keep task code changes small (<300 LOC) and include unit tests + at least one integration test per FR.  

---

End of generated task list for `006-dynamic-arena-obstacles`.
