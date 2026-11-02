# Implementation Plan — Dynamic Arena Obstacles (006)

Feature spec: `specs/006-dynamic-arena-obstacles/spec.md`
Implementation plan (this file): `specs/006-dynamic-arena-obstacles/plan.md`
Branch: `006-dynamic-arena-obstacles`
Generated: 2025-12-10

## Summary

Introduce three types of dynamic arena elements: moving barriers, timed hazard zones, and destructible cover. Deliver a deterministic, testable runtime so AI, sensors and pathfinding adapt to obstacles at runtime. Provide designer-friendly configuration and test hooks to validate obstacle behaviour in CI.

## Technical Context

- Language: TypeScript (existing runtime and ECS).  
- Physics engine: Rapier (rapier3d-compat) is available in the runtime and tests.  
- Simulation: ECS-based simulation (src/simulation, src/ecs).  
- Testing: Vitest + harness utilities (existing tests).  
- Target: Local, deterministic simulation (no multiplayer replication for this work).

### Key integration points

- `src/simulation/environment/arenaGeometry.ts` — currently implements `isLineOfSightBlocked` for static geometry.  
- AI sensors & pathing: `src/simulation/ai/sensors.ts`, `src/simulation/ai/pathing/*` — both call `isLineOfSightBlocked` or use obstacle heuristics.  
- Rapier integration points: `BattleRunner`/`BattleWorld` expose a Rapier world reference used in tests and runtime.

## Constitution Check

- Component-first: New behaviour will be implemented as focused ECS components and systems.  
- Test-first: Each production-facing feature will have unit & integration tests.  
- Observability: Instrumentation hooks and MatchTrace/telemetry events will be added to validate behaviour and determinism.

## Exit Gates (Pre-Implementation)

1. Phase-0 research artifacts complete (`research.md`).
2. Data model & contracts finalized (`data-model.md`, `contracts/*`).
3. Quickstart/dev harness and test plan established (`quickstart.md`).

------------------------------

## Phase 0 — Outline & Research

Deliverables: `research.md` (this branch)

Tasks:
- Review `arenaGeometry.ts` and AI sensor/pathing code paths that call `isLineOfSightBlocked` and list all call sites (unit tests will be added).
- Survey Rapier world usage in runtime and tests; confirm approach for raycasting or collider checks that include dynamic obstacles.
- Decide concrete ECS component names and property shapes (see `data-model.md`).
- Prototype small POC in safe sandbox tests: moving barrier motion + a LOS check that accounts for its runtime position.

Success criteria for Phase 0:
- Research doc enumerates integration points and confirms Rapier-based approach or a fallback grid-based approach for LOS and pathing.

------------------------------

## Phase 1 — Design, Data Model & Contracts

Deliverables: `data-model.md`, `quickstart.md`, `contracts/`

Key decisions (expected):
- Movement style model: deterministic periodic movement (linear path, rotation) with configurable speed/offset/phase.
- Hazard schedule model: on/off intervals (period + duty), effect types (damage per second, movement penalty), and area shape (circle/rectangle) for detection.
- Destructible cover model: durability, damage events, removal rules (permanently removed for match).
- Collision interaction: moving obstacles strictly block (do not displace units).

Design tasks:
- Finalize component shapes & system responsibilities in `data-model.md`.
- Produce acceptance contracts describing deterministic tests to validate LOS changes, AI reroute, hazard effect application and destructible cover lifecycle.
- Add quickstart instructions and CI-friendly test commands for the new tests.

------------------------------

## Phase 2 — Implementation (TDD / small increments)

Implementation will be split into small, testable steps. Keep each item minimal and covered by unit or integration tests.

Priority order (P0–P3):

P0 — Foundations (Minimal viable gameplay):

1. Add new ECS components and initial types.
   - Files: `src/ecs/components/dynamicObstacle.ts`, `src/ecs/components/movementPattern.ts`, `src/ecs/components/hazardZone.ts`, `src/ecs/components/destructibleCover.ts`.
   - Tests: unit tests for serialization and default values.

2. Moving obstacle system — deterministic movement patterns.
   - Files: `src/simulation/obstacles/movementSystem.ts`.
   - Behavior: move kinematic object positions deterministically each tick (no displacement on units).
   - Tests: unit tests exercising linear and rotational movement patterns with deterministic tick stepping.

3. Update line-of-sight checks to optionally include dynamic obstacles.
   - Option A (preferred): extend `isLineOfSightBlocked(start, end, { includeDynamic: boolean })` to query runtime dynamic obstacles when available; tests should stub runtime positions.
   - Option B (alternate): provide `isLineOfSightBlockedRuntime(start, end, world)` which performs Rapier raycasts against dynamic colliders.
   - Tests: verify LOS toggles appropriately when a moving barrier crosses a segment.

P1 — Gameplay systems & AI integration:

4. Hazard zone system: scheduling and effect application.
   - Files: `src/simulation/obstacles/hazardSystem.ts`.
   - Behavior: activate/deactivate zones, apply damage/slow to entities inside when active.
   - Tests: deterministic activation cycles and effect application tests.

5. Destructible cover system: durability, damage, removal.
   - Files: `src/simulation/obstacles/destructibleSystem.ts`.
   - Behavior: track durability, listen for damage events, remove obstacle entity when durability <= 0.
   - Tests: damage -> durability decrease -> removal; verify LOS and pathing update after removal.

6. AI/pathfinding updates.
   - Files: `src/simulation/ai/sensors.ts`, `src/simulation/ai/pathing/avoidance.ts` (or new helper module).
   - Behavior: ensure AI re-evaluates path when blocked by dynamic obstacles; add fallback behaviour (wait/retreat) if no path found.
   - Tests: pathing integration tests — AI reroutes within a bounded time when a path is blocked.

P2 — Designer tooling & test harness:

7. Add obstacle configuration formats and sample placements for `ArenaGeometry` as authoring fallback.
   - Files: Add `specs/006-dynamic-arena-obstacles/dynamic-arena-sample.json` and editor-binding hooks if an inspector exists.
   - Tests: smoke test loading sample arena and verifying obstacle initial states.

8. Instrumentation & MatchTrace events.
   - Emit events for obstacle state changes: `obstacle:move`, `hazard:activate`, `hazard:deactivate`, `cover:destroyed`.
   - Tests: record & replay events in deterministic tests to validate ordering and outcomes.

P3 — Performance testing & polish:

9. Stress/perf tests for 50 active dynamic obstacles.
   - Files: tests/stress/obstacles.stress.spec.ts
   - Acceptance: <= 80% of baseline measured in the same environment without dynamic obstacles.

10. Documentation, quickstart and examples updated.

------------------------------

## Phase 3 — Validation, Tuning & Handoff

- Run the integration harness (duel matrix or headless matches) and verify no deadlocks/determinism issues.
- QA & designer review of obstacle placements and settings via quickstart workflows.
- Finalize tasks list for implementation (see next step: `/speckit.tasks`).

## Acceptance Checklist (example)

- Unit tests for each component and system exist and pass.
- Integration tests show AI pathfinding adapts to moving obstacles in >= 99% of trials.
- Hazard zones correctly apply effects during active windows and stop when inactive.
- Destructible cover blocks LOS and is removed when durability <= 0; removal reflected in LOS and pathing tests.
- Performance: 50 active obstacles test passes the 80% baseline check.

## Artifacts to create

- `specs/006-dynamic-arena-obstacles/research.md` (Phase 0)
- `specs/006-dynamic-arena-obstacles/data-model.md` (Phase 1)
- `specs/006-dynamic-arena-obstacles/quickstart.md` (Phase 1)
- `specs/006-dynamic-arena-obstacles/contracts/` (Phase 1)

## How to run dev & unit tests (example)

Run unit tests and integration tests relevant to obstacles:

```bash
npm run test tests/simulation/obstacles -- --run
```

Run the headless integration harness (similar to duel matrix):

```bash
CI=true npm run ci:test -- --grep obstacles
```

---
Stop: Phase 2 planning complete. Next recommended command: run `/speckit.tasks` to generate detailed task breakdown and TDD work items.
