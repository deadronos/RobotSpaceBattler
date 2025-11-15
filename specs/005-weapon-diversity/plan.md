# Implementation Plan — Weapon Diversity (005)

Feature spec: `specs/005-weapon-diversity/spec.md`
Implementation plan (this file): `specs/005-weapon-diversity/plan.md`
Branch: `005-weapon-diversity`
Generated: 2025-11-13

## Technical Context

- Core systems in use: ECS simulation loop (specs/001), renderer/UI (specs/002), deterministic MatchTrace and replay (specs/003), AI roaming/avoidance (specs/004).
- Clarified decisions (from `research.md` and recent clarifications):
  - RPS multipliers: `advantageMultiplier=1.25`, `disadvantageMultiplier=0.85`, `neutral=1.0`.
  - Rocket AoE: `aoeRadius=2.5` units, linear falloff `multiplier = max(0, 1 - distance / radius)`.
  - AoE application: compute simultaneously and emit per-target damage events at the same `timestampMs`, sorted by `targetId` for deterministic MatchTrace ordering.
  - Laser damage model: ticked damage at simulation tick rate (default `tickRate=60` Hz); record per-tick `weapon-damage` events with `timestampMs` and `frameIndex`.
  - Telemetry event schema extended to include `archetype`, `isAoE`, `aoeRadius`, `sequenceId`, and `frameIndex`.

### Needs Clarification (deferred to Phase 0 if not already resolved)
- Final art/sound delivery timeline and asset names (placeholder assets acceptable for integration).
- Exact performance budgets and quality-scaling thresholds (refer to `specs/002` for limits; testing needed to define numeric budgets).

## Constitution Check

- Component & Library-First: Plan scopes feature into small systems: `balance`, `weapons`, `projectiles`, `telemetry`, `visuals`.
- Test-First: All production-facing behavior will be driven by tests (unit + duel-matrix + integration 10v10 tests).
- Size & Separation: Implementation tasks are split into small modules (each <300 LOC target).
- React/r3f: Rendering work will be confined to `visuals` components and consume authoritative state from systems.
- Observability: Telemetry and MatchTrace are authoritative and required.

## Exit Gates (Pre-Implementation)

1. Research artifacts complete (research.md items resolved).
2. Data model and contracts available (`data-model.md`, `contracts/weapon-diversity-api.yaml`).
3. Clarifications recorded in spec (`## Clarifications`) — done.
4. TDD scaffolding in place (test harness and CI tasks in `package.json` or scripts).

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
- Implement `src/simulation/balance/archetypeMultiplier.ts`:
  - Expose API `getArchetypeMultiplier(attackerArchetype, defenderArchetype)` returning one of `{1.25, 0.85, 1.0}`.
  - Unit tests: verify mappings Laser>Gun, Gun>Rocket, Rocket>Laser; test numeric application order.

2.2 Damage Resolution Pipeline
- Implement pipeline hook that applies `finalDamage = baseDamage * archetypeMultiplier * otherModifiers` before resistances.
- Add unit tests to assert ordering and reproducibility with seeded RNG.

2.3 Projectile System & Rocket AoE
- Implement projectile component/system in `src/simulation/projectiles/`.
- Implement rocket impact handling: spawn `ExplosionEvent`, compute targets within `aoeRadius=2.5`, apply linear falloff multiplier, emit per-target `weapon-damage` events (same `timestampMs` sorted by `targetId`).
- Tests: deterministic multi-target AoE test ensuring no double-apply and stable ordering.

2.4 Laser Beam System
- Implement beam logic: create beam entity, sample ray intersection, apply ticked damage at `tickRate=60` by default, emit per-tick `weapon-damage` events with `frameIndex`.
- Tests: single-target and moving-target beam tests verifying damage logs align within ±16ms.

2.5 Telemetry & MatchTrace
- Implement in-memory `TelemetryAggregator` used in tests and production toggles `src/telemetry/aggregator.ts`.
- Implement `MatchTrace` persistence: append authoritative events with fields: `matchId`, `sequenceId`, `frameIndex`, `timestampMs`, `weaponProfileId`, `archetype`, `isAoE`, `aoeRadius`, `attackerId`, `targetId`, `amount`.
- Add ingestion endpoint stub per `contracts/weapon-diversity-api.yaml` for event posting (test-only).

2.6 Visuals & Quality Scaling
- Add placeholder VFX assets: rocket trail + explosion, laser beam/tracer, gun tracer/impact.
- Wire visuals to `visualRefs` from WeaponProfile and respect QualityManager settings.
- Tests: run smoke scene with quality presets and assert no simulation behavior changes.

2.7 AI Weapon Heuristics
- Update AI selection heuristics to include RPS consideration and engagement-range heuristics; tests to verify selection frequencies in controlled contexts.

2.8 Duel Matrix Harness & Tests
- Implement harness `scripts/duel-matrix/run-duels.ts` to run N=30 duels per pairing and aggregate `winCounts` and damage totals using in-memory aggregator.
- Add Vitest tests asserting advantaged archetype wins >= 70%.

2.9 10v10 Observer Integration
- Add integration test that runs a headless 10v10 match (observer mode) and verifies spawn counts, telemetry emission, and eventual winner declaration.

2.10 Performance & Tuning
- Run performance sweeps for VFX density and verify match outcome invariance.

2.11 Docs & PR
- Update README/quickstart and create PR with `CONSTITUTION-CHECK` section, tests, and exec summary.

### 2.12 Rendering Instancing & Pooling (detailed tasks)
Purpose: Replace per-entity React visual components for ephemeral, visual-only entities with GPU-friendly instanced or batched renderers. This reduces CPU/React overhead and draw calls for high-VFX scenarios while preserving simulation semantics.

2.12.1 Scope & Targets
- Projectiles (gun bullets, rockets): `InstancedMesh` by archetype (bullet/rocket) with `instanceMatrix` and `instanceColor` attributes.
- Laser beams: `LineSegments` or instanced line geometry batched per-frame to handle many beams with minimal draw calls.
- Effects (explosions, sparks, impact rings) and small particles: `InstancedMesh`/`Points` with per-instance attributes (time, opacity, color), optionally shader-based.
- Decorative/ambient visual-only entities (debris, small props): instanced where reused.
- Robots (visual-only) remain NOT instanced by default until a later decoupling step (physics/visual separation).

Files to modify & new files to add
- Modify:
  - `src/components/Simulation.tsx` — replace per-entity `ProjectileVisual`/`EffectVisual` with `InstancedProjectiles`/`InstancedEffects`.
  - `src/components/vfx/ProjectileVisual.tsx` — keep as debug fallback and for parity testing; optionally remove when instancing is stable.
  - `src/components/vfx/EffectVisual.tsx` — keep as debug fallback.
  - `src/simulation/projectiles` (system) — allocate/release instance indices during spawn & expiration.
  - `src/simulation/effects` (system) — allocate/release instance indices during spawn & expiration.
- Add:
  - `src/components/vfx/InstancedProjectiles.tsx`
  - `src/components/vfx/LaserBatchRenderer.tsx`
  - `src/components/vfx/InstancedEffects.tsx`
  - `src/visuals/VisualInstanceManager.ts`
  - `src/ecs/pools/ProjectilePool.ts` (optional)
  - `src/ecs/pools/EffectPool.ts` (optional)

2.12.2 Low-risk first steps (Proof-of-Concept)
- Add `src/components/vfx/InstancedProjectiles.tsx` (POC): implement minimal `InstancedMesh` for gun bullets and a simple `InstancedMesh` for rockets. Ensure an instance index mapping exists and is updated per frame via `instancedMesh.setMatrixAt(index, matrix)`, `.instanceMatrix.needsUpdate = true`.
- Add `src/components/vfx/LaserBatchRenderer.tsx` (POC): implement a `LineSegments` buffer that accepts all active `laser` projectile start and end positions and reconstructs a dynamic `BufferGeometry` each frame.
- Keep `ProjectileVisual` mapping as a dev-only fallback behind `process.env.REACT_APP_VFX_INSTANCING` toggle.

2.12.3 Visual Instance Manager & Pools
- Add `src/visuals/VisualInstanceManager.ts`: a small module that provides per-category `allocateIndex(entityId)` / `releaseIndex(entityId)` operations and a `getIndex(entityId)` lookup. It returns `instanceIndex` and supports a `maxInstances` parameter per category.
- Add `src/ecs/pools/ProjectilePool.ts` (optional): two strategies: (A) keep pre-allocated entities in `miniplex` with `active` flag and toggle active; (B) maintain external object memory and add/remove from `miniplex` as `acquire`/`release`. Implement (A) as default if compatible with miniplex constraints.
- Add `src/ecs/pools/EffectPool.ts` for effects if necessary.

2.12.4 Systems integration
- Update `src/simulation/projectiles/` system: upon projectile spawn, call `VisualInstanceManager.allocateIndex()` and store `instanceIndex` within the projectile entity. On projectile expiry, call `VisualInstanceManager.releaseIndex()`.
- Update `src/simulation/effects/` system: same lifecycle management for effects.
- Ensure no simulation semantics are changed; instancing only affects visuals.

2.12.5 Renderer changes & UI integration
- Add new components:
  - `src/components/vfx/InstancedProjectiles.tsx`: reads `battleWorld.projectiles.entities`, groups by archetype, updates instance transforms & colors per frame; exposes debug mode to use `ProjectileVisual` for uninstanced items.
  - `src/components/vfx/LaserBatchRenderer.tsx`: batch lasers as `LineSegments`.
  - `src/components/vfx/InstancedEffects.tsx`: batch explosions and impacts using instanced geometry and simple shaders for fade and color.
- Modify `src/components/Simulation.tsx`: replace per-`ProjectileVisual` / `EffectVisual` mapping with `InstancedProjectiles` and `InstancedEffects` rendered once per scene; keep `RobotPlaceholder` per-entity for now.

2.12.6 Feature toggles & Quality manager
- Add toggle in `QualityManager` (`visuals.instancing.enabled`) and config keys for `maxInstances.bullets`, `maxInstances.rockets`, `maxInstances.lasers`, `maxInstances.effects` with sensible defaults (e.g., 128 bullets, 48 rockets, 32 lasers, 256 effects).
- If toggled off, preserve current per-entity rendering for parity and testing.

2.12.7 Telemetry, Observability & Testing
- Emit telemetry events on: `VFX:Instancing:Alloc(index, entityId, category)`, `VFX:Instancing:Release(index, entityId, category)`, and `VFX:Instancing:Fallback(category, reason)`. Write a small aggregator for these events in `TelemetryPort`.
- Add headless perf tests and screenshot parity tests in `tests/` for both instanced and non-instanced scenarios: test `drawCallCount` is improved, `frameTime` is reduced, and visuals match (pixel-diff or acceptance threshold).

2.12.8 Optional: Robot decoupling & instanced visuals (advanced)
- If profiling demonstrates robots are also a material bottleneck, add a later-phase (Phase 4) task to decouple physics from visuals: render robots as `InstancedMesh` while keeping per-robot colliders and RigidBody in synchronous state updates. This requires robust testing for determinism.

2.12.9 Acceptance criteria for instancing
- Visual parity verified and instancing reduces CPU update cost and draw calls in the dev environment.
- No change to MatchTrace records or simulation output; telemetry remains unchanged (except optional instancing telemetry).
- Fallbacks log telemetry and remain under a low threshold for normal test loads.

2.12.10 Rollout & Validation
- Begin with a POC branch implementing `InstancedProjectiles` and corresponding tests.
- Validate performance and parity and then roll out `LaserBatchRenderer` and `InstancedEffects` subsequently; add `EffectPool` as needed.
- Merge with `QualityManager` toggles and QA validation.

2.12.11 Performance & Measurement Harness
- Add lightweight headless perf harness scripts in `scripts/perf/measure_drawcalls.js` that:
  - Build a release version of the app (`npm run build`) and serve it temporarily (e.g., `npm run preview`).
  - Launch a headless browser (puppeteer) and navigate to the scene, toggle `VFX_INSTANCING` on/off via URL query or a debug toggle.
  - Collect runtime metrics: `renderer.info.render.calls`, `renderer.info.render.triangles`, JS per-frame timing from a `window.__rendererStats` insertion, and instance counts by category.
  - Capture averages across a steady-state frame window and store to JSON for later comparison.
  - Report if instanced mode improves draw-calls and JS render time relative to baseline; if not, flag for team review.

Phase 3 — Validation & Tuning (brief)

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
 - Visual instancing parity & perf check: run `Test F — Instancing` (spec) and assert instanced mode reduces draw calls and JS render overhead while maintaining visual parity and telemetry determinism.

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

2. Run duel matrix (node script):

```bash
node scripts/duel-matrix/run-duels.js --runs=30
```

3. Run headless 10v10 integration (CI):

```bash
CI=true npm run ci:test
```

---
Stop: Phase 2 planning complete. Next recommended command: `/speckit.plan` executed (this file) — implementation may begin following TDD steps above.
# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
