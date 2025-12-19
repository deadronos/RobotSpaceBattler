# Implementation Plan — Weapon Diversity (005)

Feature spec: `specs/005-weapon-diversity/spec.md`
Implementation plan (this file): `specs/005-weapon-diversity/plan.md`
Branch: `005-weapon-diversity`
Generated: 2025-11-13

## Technical Context

- Core systems in use: ECS simulation loop (specs/001), renderer/UI (specs/002), deterministic
  MatchTrace and replay (specs/003), AI roaming/avoidance (specs/004).
- Clarified decisions (from `research.md` and recent clarifications):
  - RPS multipliers: `advantageMultiplier=1.25`, `disadvantageMultiplier=0.85`, `neutral=1.0`.
  - Rocket AoE: `aoeRadius=2.5` units, linear falloff `multiplier = max(0, 1 - distance / radius)`.
  - AoE application: compute simultaneously and emit per-target damage events at the same
    `timestampMs`, sorted by `targetId` for deterministic MatchTrace ordering.
  - Laser damage model: ticked damage at simulation tick rate (default `tickRate=60` Hz); record
    per-tick `weapon-damage` events with `timestampMs` and `frameIndex`.
  - Telemetry event schema extended to include `archetype`, `isAoE`, `aoeRadius`, `sequenceId`, and `frameIndex`.

### Needs Clarification (deferred to Phase 0 if not already resolved)

- Final art/sound delivery timeline and asset names (placeholder assets acceptable for integration).
- Exact performance budgets and quality-scaling thresholds (refer to `specs/002` for limits;
  testing needed to define numeric budgets).

## Constitution Check

- Component & Library-First: Plan scopes feature into small systems: `balance`, `weapons`, `projectiles`, `telemetry`, `visuals`.
- Test-First: All production-facing behavior will be driven by tests (unit + duel-matrix + integration 10v10 tests).
- Size & Separation: Implementation tasks are split into small modules (each <300 LOC target).
- React/r3f: Rendering work will be confined to `visuals` components and consume authoritative state from systems.
- Observability: Telemetry and MatchTrace are authoritative and required.

## Exit Gates (Pre-Implementation)

1. Research artifacts complete (research.md items resolved).
1. Data model and contracts available (`data-model.md`, `contracts/weapon-diversity-api.yaml`).
1. Clarifications recorded in spec (`## Clarifications`) — done.
1. TDD scaffolding in place (test harness and CI tasks in `package.json` or scripts).

## Phase 0 — Outline & Research (deliverables)

Tasks:

- Consolidate `research.md` (ensure Decision Log entries present) — owner: design lead.
- Verify asset placeholders and create fallback visuals (simple geometry/particle markers) — owner: art/engineer.
- Produce a short perf-validation checklist (link to `specs/002`) — owner: eng.

Deliverable: finalized `research.md` with decisions and open follow-ups.

## Phase 1 — Design & Contracts (deliverables)

Tasks:

- Finalize `data-model.md` (done) and add TypeScript types in `src/lib/weapons/types.ts` (task).
- Finalize OpenAPI contract `contracts/weapon-diversity-api.yaml` (done) and add server stubs for telemetry ingest.
- Create `quickstart.md` (done) and add runnable test harness commands.
- Run `.specify/scripts/bash/update-agent-context.sh copilot` (if applicable) to update agent context file (task).

Deliverables: `data-model.md`, `contracts/*`, `quickstart.md`, agent-context updates.

## Phase 2 — Implementation (detailed tasks)

Break tasks into small, testable increments (TDD):

2.1 Balance Module & Unit Tests

- Implement `src/simulation/balance/archetypeMultiplier.ts`.

- Add toggle in `QualityManager` (`visuals.instancing.enabled`) and config keys for
  `maxInstances.bullets`, `maxInstances.rockets`, `maxInstances.lasers`,
  `maxInstances.effects` with sensible defaults (e.g., 128 bullets, 48 rockets, 32 lasers, 256
  effects).
- If toggled off, preserve current per-entity rendering for parity and testing.

2.12.7 Telemetry, Observability & Testing

- Emit telemetry events on `VFX:Instancing:Alloc(index, entityId, category)`,
  `VFX:Instancing:Release(index, entityId, category)`, and
  `VFX:Instancing:Fallback(category, reason)`.
- Write a small aggregator for these events in `TelemetryPort`.
- Add headless perf tests and screenshot parity tests in `tests/` for both instanced and
  non-instanced scenarios: test `drawCallCount` is improved, `frameTime` is reduced, and visuals
  match (pixel-diff or acceptance threshold).

2.12.8 Optional: Robot decoupling & instanced visuals (advanced)

- If profiling demonstrates robots are also a material bottleneck, add a later-phase (Phase 4)
  task to decouple physics from visuals: render robots as `InstancedMesh` while keeping per-robot
  colliders and RigidBody in synchronous state updates. This requires robust testing for
  determinism.

2.12.9 Acceptance criteria for instancing

- Visual parity verified and instancing reduces CPU update cost and draw calls in the dev environment.
- No change to MatchTrace records or simulation output; telemetry remains unchanged (except optional instancing telemetry).
- Fallbacks log telemetry and remain under a low threshold for normal test loads.

2.12.10 Rollout & Validation

- Begin with a POC branch implementing `InstancedProjectiles` and corresponding tests.
- Validate performance and parity and then roll out `LaserBatchRenderer` and `InstancedEffects`
  subsequently; add `EffectPool` as needed.
- Merge with `QualityManager` toggles and QA validation.

2.12.11 Performance & Measurement Harness

- Add lightweight headless perf harness scripts in `scripts/perf/measure_drawcalls.js` that:
  - Build a release version of the app (`npm run build`) and serve it temporarily (e.g., `npm run preview`).
  - Launch a headless browser (puppeteer) and navigate to the scene, toggle `VFX_INSTANCING`
    on/off via URL query or a debug toggle.
  - Collect runtime metrics: `renderer.info.render.calls`, `renderer.info.render.triangles`, JS
    per-frame timing from a `window.__rendererStats` insertion, and instance counts by category.
  - Capture averages across a steady-state frame window and store to JSON for later comparison.
  - Report if instanced mode improves draw calls and JS render time relative to baseline; if not,
    flag for team review.

## Phase 3 — Validation & Tuning (brief)

- Execute duel-matrix across seed variations and collect statistics.
- Adjust multipliers if required and re-run tests until acceptance.
- Record final tuning in `research.md` and update `spec.md` acceptance notes.

### Post-Implementation Checks (instancing)

- Validate logging of `VFX:Instancing:Fallback` is present and under threshold in test runs.
- Collect performance deltas and update `specs/002` quality defaults if needed.
- Add an `instancing` section to `./docs/RELEASE_NOTES.md` describing toggles and known issues.

## Acceptance Checklist

- Unit tests covering `archetypeMultiplier` + damage pipeline.
- Duel matrix test: 30+ runs per pairing, advantaged wins >= 70%.
- Rocket AoE tests: 50 impact captures with explosion events logged (>=95% reliability in test harness).
- Laser beam alignment tests: damage timestamps aligned within ±16ms for >=95% of sampled events.
- 10v10 integration test passes and MatchTrace persisted.
- Visual instancing parity & perf check: run `Test F — Instancing` (spec) and assert instanced
  mode reduces draw calls and JS render overhead while maintaining visual parity and telemetry
  determinism.

## Artifacts Created / Paths

- `specs/005-weapon-diversity/research.md` (existing — updated)
- `specs/005-weapon-diversity/data-model.md` (existing)
- `specs/005-weapon-diversity/contracts/weapon-diversity-api.yaml` (existing)
- `specs/005-weapon-diversity/quickstart.md` (existing)
- `specs/005-weapon-diversity/plan.md` (this file)

## How to run key dev flows (quick)

1. Run unit tests:

```bash
npm run test
```

1. Run duel matrix (node script):

```bash
node scripts/duel-matrix/run-duels.js --runs=30
```

1. Run headless 10v10 integration (CI):

```bash
CI=true npm run ci:test
```

