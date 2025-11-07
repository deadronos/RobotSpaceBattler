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

**Language/Version**: TypeScript 5.x targeting ES2022 (project already configured with TS config)
**Primary Dependencies**: React 18+, react-three-fiber (r3f), drei utilities, vite, ajv (for JSON Schema validation), vitest (existing test harness)
**Storage**: In-memory runtime structures; optional local JSON export for MatchTrace (no DB required)
**Testing**: Vitest + Testing Library for unit/component tests; JSON Schema (ajv) for contract validation
**Target Platform**: Modern Chromium-based browsers (development baseline: Chrome/Edge 120+ as per constitution)
**Project Type**: Web single-page application (frontend-focused feature integrated into existing `src/`)
**Performance Goals**: Renderer should target 60 fps on demo machines for the default visual profile; provide lower-fidelity profiles to maintain simulation correctness when rendering drops below real-time
**Constraints**: Keep rendering components lightweight (follow r3f best practices); no backend changes; no persistent storage; deterministic simulation seed must be recordable and pluggable
**Scale/Scope**: Single-match demo scenarios; not intended for large-scale concurrent matches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Applicable gates and preliminary assessment (must be justified in PR):

- Principle II (Test-First): ALL production-facing behavior for this feature will be accompanied by tests: contract validator (Vitest + ajv), unit tests for simulation mapping utilities, and component tests for HUD and fallback behavior.
- Principle IV (r3f Best Practices): Rendering will be separated from simulation logic. Render components will be pure consumers of trace/state; heavy work (snapshot parsing, interpolation) will be done in utilities or workers where needed.
- Principle I & III (Component-first, Size limits): New code will be split into small components under `src/components/` and `src/systems/` with files kept under ~300 LOC.
- Principle V (Observability & Performance): Add debug logging guarded by flags and basic metrics for render fps and trace playback timing; performance goals documented above.

No violations identified at plan time. Any future deviation (e.g., adding a new top-level package) must be documented in the Complexity Tracking table.

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

**Structure Decision**: Feature will live inside the existing frontend `src/` layout. Concrete paths:

- `src/systems/matchTrace/` — utilities for loading and parsing MatchTrace, interpolation, RNG seed handling, and contract validator helper
- `src/components/match/` — small presentational components: `MatchPlayer`, `MatchHUD`, `MatchCinematic`
- `specs/003-extend-placeholder-create/schemas/` — JSON Schemas: `team.schema.json`, `matchtrace.schema.json`
- `tests/contract-validator.spec.ts` — Vitest test harness referenced in the spec

This keeps the implementation component-first and co-located with other renderer/simulation code.

## Generated artifacts (from this plan run)

- `specs/003-extend-placeholder-create/research.md` — Phase 0 decisions and rationale
- `specs/003-extend-placeholder-create/data-model.md` — canonical entities and fields
- `specs/003-extend-placeholder-create/schemas/team.schema.json`
- `specs/003-extend-placeholder-create/schemas/matchtrace.schema.json`
- `specs/003-extend-placeholder-create/quickstart.md`
- `tests/contract-validator.spec.ts` — Vitest test harness validating example payloads against schemas

Branch: `003-extend-placeholder-create`
directories captured above]

## Live Playback Architecture (Phase 7 Clarification)

**Key Insight**: We do NOT need two separate rendering paths (live vs. replay). Instead,
we unify on a single approach: **capture trace events as the simulation runs, then render
from that live trace in real-time.**

### Architecture: Unified Trace-Driven Rendering

```plaintext
┌─────────────────────────────────────────────────────────────┐
│ ECS Simulation Loop (existing usePhysicsSync)              │
│                                                               │
│  ├─ spawnInitialTeams()                                      │
│  ├─ updateBehaviors()                                        │
│  ├─ applyMovement()                                          │
│  ├─ runWeaponSystem()                                        │
│  ├─ stepPhysics()                                            │
│  ├─ handleProjectileHits()                                   │
│  ├─ applyDamage() / eliminateRobot()                        │
│  └─ evaluateVictory()                                        │
└─────────────────────────────────────────────────────────────┘
          ↓ (capture events during each step)
┌─────────────────────────────────────────────────────────────┐
│ Live Trace Builder Hook (NEW: useLiveMatchTrace)           │
│                                                               │
│  ├─ Listen to entity creation/destruction                   │
│  ├─ Capture movement deltas (spawn, move events)            │
│  ├─ Capture weapon fire (fire events)                       │
│  ├─ Capture damage/death (damage, death events)             │
│  └─ Maintain growing MatchTrace with timestamp + sequenceId │
└─────────────────────────────────────────────────────────────┘
          ↓ (current frame's events)
┌─────────────────────────────────────────────────────────────┐
│ Live Trace (in-memory event log)                            │
│                                                               │
│  {                                                            │
│    rngSeed: 12345,                                           │
│    rngAlgorithm: "xorshift32-v1",                           │
│    events: [                                                 │
│      { type: 'spawn', timestampMs: 0, ... },               │
│      { type: 'move', timestampMs: 16, ... },               │
│      { type: 'fire', timestampMs: 32, ... },               │
│      { type: 'damage', timestampMs: 48, ... },             │
│      ... (grows as simulation runs)                         │
│    ]                                                         │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
          ↓ (pass to renderer)
┌─────────────────────────────────────────────────────────────┐
│ Renderer (MatchSceneInner via Scene.tsx)                    │
│                                                               │
│  ├─ useMatchSimulation(currentLiveTrace)                    │
│  ├─ useMatchTimeline() steps through events at current time │
│  ├─ RenderedRobot[] interpolated to timeline timestamp      │
│  ├─ RenderedProjectile[] rendered from fire events          │
│  ├─ HUD overlay shows time, entity count, status            │
│  └─ useVisualQuality() applies quality profiles             │
└─────────────────────────────────────────────────────────────┘
          ↓ (output)
┌─────────────────────────────────────────────────────────────┐
│ Screen: 3D match rendered in real-time                      │
│                                                               │
│  Robots move, fire, take damage → live rendered on screen   │
│  Victory triggers when simulation completes                 │
│  VictoryOverlay pops up with winner + stats                │
└─────────────────────────────────────────────────────────────┘
```

### Why This Works

1. **Single Source of Truth**: The trace IS the simulation output. No redundant event
   capture.
2. **Deterministic Replay**: Trace captured during live run can be replayed exactly
   (same RNG seed).
3. **No Coordination Problem**: Renderer doesn't lag behind or race ahead—it follows
   trace timestamp.
4. **Quality Invariant**: Changing visual quality doesn't affect trace, so outcome
   stays identical.
5. **Backwards Compatible**: Existing replay system (MatchSceneInner + useMatchTimeline)
   unchanged.

### Implementation Phases

#### Phase 5.1: Live Trace Capture (T050 - NEW)

**Create hook**: `useLiveMatchTrace(world: SimulationWorld)`

- Subscribe to entity spawns/deaths
- Capture move events from position deltas
- Capture weapon fire from projectile creation
- Capture damage/death from health changes
- Return live `MatchTrace` object that grows each frame

#### Phase 5.2: Wire Live Trace to Renderer (T051 - NEW)

**Modify**: `Scene.tsx` + `Simulation.tsx`

- Pass live trace from `useLiveMatchTrace` to `MatchSceneInner`
- Remove static `RobotPlaceholder` components
- Render dynamic entities from trace

#### Phase 5.3: Add Quality Toggle UI (T052 - NEW)

**Modify**: `ControlStrip.tsx` + `useVisualQuality` store

- Add button to toggle High/Medium/Low quality
- Verify visual changes don't affect trace

#### Phase 5.4: Create Between-Rounds UI (T053 - NEW)

**Create component**: `BetweenRoundsUI.tsx`

- Show match result summary
- Add "Rematch" button (new RNG seed)
- Add team selection screen for next match

### Key Design Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Capture during simulation | Events already computed; simpler at source | Requires instrumenting ECS |
| Use existing MatchSceneInner | No new rendering path | Negligible trace-to-render latency |
| Grow trace each frame | Simple accumulation | Memory grows with duration |
| No separate Live/Replay | Single code path | Less future flexibility |

### Event Capture Points

Instruments needed in ECS simulation:

1. **Spawn Events** — `spawnInitialTeams()` in `spawnSystem.ts`
   - `{ type: 'spawn', entityId, teamId, position, timestampMs }`

2. **Move Events** — `applyMovement()` in `aiController.ts`
   - `{ type: 'move', entityId, newPosition, timestampMs }`

3. **Fire Events** — `runWeaponSystem()` in `weaponSystem.ts`
   - `{ type: 'fire', firingEntityId, projectileId, targetPosition, timestampMs }`

4. **Damage Events** — `applyDamage()` in `damageSystem.ts`
   - `{ type: 'damage', targetId, attackerId, amount, newHealth, maxHealth, timestampMs }`

5. **Death Events** — `eliminateRobot()` in `damageSystem.ts`
   - `{ type: 'death', deadEntityId, killerEntityId, timestampMs }`

Each capture gets a `sequenceId` counter for deterministic tie-breaking.



## Complexity Tracking

Fill ONLY if Constitution Check has violations that must be justified:

| Violation | Why Needed | Simpler Alternative |
|-----------|------------|---------------------|
| Trace capture instrumentation | Live trace needs events from 5 ECS systems | Post-sim collection loses timing |
| New hook `useLiveMatchTrace` | Expose growing trace to React | Event emitter less integrated |
