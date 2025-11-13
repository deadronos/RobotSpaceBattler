```markdown
---
title: "Tasks — Weapon Diversity (005)"
---

# Tasks: Weapon Diversity (005)

**Input**: Design documents from `specs/005-weapon-diversity/` (see `plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/`).

**Prerequisites**: Foundation tasks (Phase 1 & 2) must complete before user stories.

---

## Phase 1: Setup (Shared infrastructure)

Purpose: Create the minimal project scaffolding and placeholders required to implement and test the feature.

- [X] T001 [P] Create TypeScript weapon types file at `src/lib/weapons/types.ts` (define `WeaponProfile`, `BalanceMultipliers`, `ProjectileInstance`, `ExplosionEvent`, `WeaponTelemetry`, `TelemetryAggregator`).
- [X] T002 [P] Add placeholder VFX assets and README in `public/assets/vfx/weapon-placeholders/` (placeholder files: `rocket-placeholder.png`, `laser-placeholder.png`, `gun-placeholder.png`).
- [X] T003 [P] Add duel-matrix script skeleton `scripts/duel-matrix/run-duels.ts` with CLI args `--archetypeA`, `--archetypeB`, `--runs`.

---

## Phase 2: Foundational (Blocking prerequisites)

Purpose: Core systems that MUST be implemented before any user story work begins. These are blocking for story work.

- [X] T004 [P] Implement in-memory `TelemetryAggregator` at `src/telemetry/aggregator.ts` (API: `startMatch(matchId)`, `record(event)`, `summary()`).
- [X] T005 [P] Implement `MatchTrace` writer at `src/telemetry/matchTrace.ts` (append authoritative per-match events, file path `trace/<matchId>.ndjson`).
- [-] T006 [P] Add telemetry ingest API stub for `POST /telemetry/event` at `src/server/api/telemetry.ts` matching `contracts/weapon-diversity-api.yaml` (SKIPPED - no backend server).
- [-] T007 [P] Add match-start API stub `POST /match/start` at `src/server/api/match.ts` that triggers match initialization in the simulation harness (SKIPPED - no backend server).
- [-] T008 [P] Add duel-run API stub `POST /duel/run` at `src/server/api/duel.ts` that forwards to the duel harness (`scripts/duel-matrix/run-duels.ts`) (SKIPPED - no backend server).
- [X] T009 [P] Wire test harness registration: update `tests/setup.ts` (or `tests/setup/*.ts`) to register the in-memory `TelemetryAggregator` and `MatchTrace` writer for tests.

**Checkpoint**: After T004–T009 complete, user story work may begin in parallel.

---

## Phase 3: User Story Phases (Priority order)

Note: All user stories below are Priority P1 per `spec.md`. Each story includes an independent test and implementation tasks (models → services → endpoints/UI → integration tests).

### Phase 3.1: User Story 1 — Watch a 10v10 automated match (P1) [US1]

Goal: Start or join a 10v10 automated match as an observer; verify 10 red and 10 blue robots spawn and fight autonomously.

Independent Test: `tests/integration/10v10-observer.spec.ts` should POST to `POST /match/start` or run harness and assert 10x10 spawn, autonomous engagement, and eventual winner.

- [ ] T010 [US1] Implement match spawn orchestrator `src/simulation/match/matchSpawner.ts` (create 10 red + 10 blue bots, configured spawn zones).
- [ ] T011 [US1] Implement match start flow connected to API stub at `src/simulation/match/startMatch.ts` (callable from `src/server/api/match.ts`).
- [ ] T012 [US1] Implement observer camera component `src/components/ObserverCamera.tsx` (modes: free, follow, cinematic) and wire to spectator UI.
- [ ] T013 [US1] Add integration test `tests/integration/10v10-observer.spec.ts` that starts a match, asserts spawns, toggles camera modes, and verifies no control inputs reach robots.
- [ ] T014 [US1] Add lightweight spectator UI hook `src/ui/spectator/StartMatchButton.tsx` (used by manual validation and smoke runs).

### Phase 3.2: User Story 2 — Observe distinct weapon behaviour & visuals (P1) [US2]

Goal: Rockets show projectile trails and AoE explosions; lasers show beams/tracers; guns show ballistic tracers. Visuals and telemetry must be observable and deterministic for replay.

Independent Test: `tests/weapon/visuals-smoke.spec.ts` captures a sample run demonstrating rocket explosion VFX and laser beam/tracer alignment; telemetry events recorded for each observed effect.

- [X] T015 [US2] Implement `WeaponProfile` model and loader at `src/lib/weapons/WeaponProfile.ts` (consumes `src/lib/weapons/types.ts`).
- [X] T016 [US2] Implement projectile system entry `src/simulation/projectiles/ProjectileSystem.ts` (spawn/update/resolve projectiles).
- [X] T017 [US2] Implement rocket projectile and AoE resolution at `src/simulation/projectiles/rocket.ts` (AoE radius `2.5`, linear falloff multiplier formula per `plan.md`) and emit per-target `weapon-damage` events sorted by `targetId`.
- [X] T018 [US2] Implement laser beam system at `src/simulation/weapons/laserBeam.ts` (tick damage at `tickRate=60` Hz, emit per-tick `weapon-damage` with `frameIndex`).
- [X] T019 [US2] Add placeholder visuals: `src/visuals/weapons/RocketExplosion.tsx`, `src/visuals/weapons/LaserBeam.tsx`, `src/visuals/weapons/GunTracer.tsx` (respect `QualityManager` settings).
- [X] T020 [US2] Instrument telemetry hooks in `src/simulation/damage/damagePipeline.ts` to `record()` events: `weapon-fired`, `weapon-hit`, `explosion-aoe`, `weapon-damage`.
- [X] T021 [US2] Add smoke/integration tests: `tests/weapon/rocket-aoe.test.ts` and `tests/weapon/laser-beam.test.ts` validating deterministic ordering and timing (±16ms tolerance for beam alignment).

### Phase 3.3: User Story 3 — Balance validation & rock-paper-scissors tests (P1) [US3]

Goal: Provide automated duel matrix, unit tests, and telemetry to validate RPS relations (Laser > Gun, Gun > Rocket, Rocket > Laser) and designer-tunable multipliers.

Independent Test: `scripts/duel-matrix/run-duels.ts --archetypeA=laser --archetypeB=gun --runs=30` produces summarized `winCounts` where advantaged archetype ≥70% wins.

- [X] T022 [US3] Implement archetype multiplier module `src/simulation/balance/archetypeMultiplier.ts` (API: `getArchetypeMultiplier(attacker, defender)` returning `1.25|0.85|1.0`).
- [X] T023 [US3] Integrate archetype multiplier into damage pipeline `src/simulation/damage/damagePipeline.ts` ensuring `finalDamage = baseDamage * archetypeMultiplier * otherModifiers` before resistances.
- [X] T024 [US3] Implement/complete duel harness logic in `scripts/duel-matrix/run-duels.ts` (run N duels, seedable RNG, aggregate results via `TelemetryAggregator`).
- [ ] T025 [US3] Add duel matrix API wiring `src/server/api/duel.ts` to call the duel harness and return `winCounts` / `damageTotals` as defined in `contracts/weapon-diversity-api.yaml` (SKIPPED - no API server).
- [X] T026 [US3] Add automated duel tests `tests/duel/duel-matrix.spec.ts` that run harness headlessly (or call API) and assert advantaged weapon wins ≥70% (configurable sample size).

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Update `specs/005-weapon-diversity/quickstart.md` with exact run commands and troubleshooting notes for the feature.
- [ ] T028 [P] Add CI / package.json script `scripts` entries: `duel-matrix`, `run-10v10`, and `telemetry-smoke` and document them in `package.json`.
- [ ] T029 [P] Performance & quality-scaling tests: add `tests/perf/vfx-quality.spec.ts` and scripts to sweep `QualityManager` presets and assert simulation invariance.
- [ ] T030 [P] Documentation & PR: write `specs/005-weapon-diversity/README.md` summarizing acceptance criteria, quickstart commands, and decision log links.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (Setup must be complete before Foundational completes where indicated)
- Foundational (Phase 2: T004–T009) BLOCKS all User Story phases (T010+)
- After Phase 2 completes, User Stories (US1, US2, US3) can be implemented in parallel by different engineers, subject to file ownership and collisions.

### Story Dependencies (high level)
- US1 (10v10) depends on: T004, T005, T006, T007, T009
- US2 (Visuals & mechanics) depends on: T001, T004, T005, T016
- US3 (Balance + duel harness) depends on: T001, T004, T005, T003

---

## Parallel Execution Examples

- Foundation: `T004`, `T005`, `T006`, `T007`, `T008`, `T009` can be worked on in parallel by separate engineers.
- US2 parallel: `T017` (rocket) and `T018` (laser) and `T019` (visuals) are independent and can be implemented in parallel once weapon types exist.
- US3 parallel: writing `T022` (multiplier) and `T023` (damage pipeline integration) can be split: one engineer implements `T022`, another updates pipeline `T023` after API is stable.

---

## Independent Test Criteria (per story)

- **US1**: `tests/integration/10v10-observer.spec.ts` — Start match, assert 10 red + 10 blue spawn, verify observer cannot control robots, toggle camera modes.
- **US2**: `tests/weapon/rocket-aoe.test.ts`, `tests/weapon/laser-beam.test.ts` — Rocket AoE emits `explosion-aoe` and `weapon-damage` events with deterministic ordering; Laser beam emits per-tick `weapon-damage` and visuals align within ±16ms.
- **US3**: `tests/duel/duel-matrix.spec.ts` — For each pairing (laser/gun, gun/rocket, rocket/laser) run ≥30 duels and assert advantaged archetype ≥70% win rate.

---

## Implementation Strategy

- MVP First: Complete Phase 1 + Phase 2 → Implement US1 (10v10 observer) → VALIDATE (smoke integration test). If green, deliver MVP demo.
- Incremental: After MVP, implement US2 (mechanics & visuals) and US3 (balance harness) in parallel as resources permit. Prefer small, testable commits (<300 LOC) and add unit tests first where practical.
- Tests: Where acceptance requires numerical thresholds (duel matrix), write tests that run headlessly and return clear JSON summaries to enable CI gating.

---

## File To Be Created

- `specs/005-weapon-diversity/tasks.md` (this file)

---

End of generated tasks for Weapon Diversity (005).

```