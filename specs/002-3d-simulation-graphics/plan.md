
# Implementation Plan: 3D simulation fight graphics

**Branch**: `002-3d-simulation-graphics` | **Date**: 2025-10-13 | **Spec**: `/specs/002-3d-simulation-graphics/spec.md`
**Input**: Feature specification from `/specs/002-3d-simulation-graphics/spec.md`

## Summary

Implement a small, test-first battle UI for in-round simulation gameplay using the
existing TypeScript + React + react-three-fiber stack. The UI will be delivered as
focused components that consume read-only state exposed by selectors/adapters from
the simulation systems. Quality-scaling will be driven by the existing performance
manager (no separate ad-hoc scaling). Testing will be TDD-first: start by authoring
failing unit and integration tests (Vitest + @react-three/test-renderer) and end-to-end
Playwright scenarios that include ARIA structural snapshots and tolerant visual-diff
(SSIM ≥ 0.97) checks.

Primary goals:

- Show a distinct in-round battle UI during active rounds and hide/minimize non-round UI.  
- Provide follow and cinematic camera modes with adaptive UI (per-robot overlay while following).  
- Expose accessibility toggles (reduced-motion) and performance-scaling hooks so UI stays responsive.  

## Technical Context

**Language/Version**: TypeScript 5.x (repo: TypeScript ^5.9.3)  
**Primary Dependencies**: React 19.2.0, three 0.180.0, @react-three/fiber 9.3.0, @react-three/drei 10.7.6, @react-three/rapier 2.1.0, zustand (ui store), miniplex (ECS utilities). Testing deps: Vitest, @testing-library/react, @react-three/test-renderer, Playwright, pixelmatch/pngjs for tolerant visual diffs.  
**Storage**: N/A (runtime in-memory state — UI consumes selectors from simulation; no new storage required).  
**Testing**: Unit tests via Vitest with DOM and r3f component tests; integration tests for selector adapters; Playwright E2E for accessibility snapshots (toMatchAriaSnapshot) and tolerant visual diffs (SSIM ≥ 0.97) with artifact collection on failure.  
**Target Platform**: Modern Chromium-based desktop browsers (Chrome / Edge stable — QA baseline: Chrome stable on RTX-3060-class machine; see spec clarifications).  
**Project Type**: Frontend/web (single repository; UI feature implemented inside existing `src/` React app).  
**Performance Goals**: Target 60 fps representative rounds on the QA lab reference machine; fallback to ≥30 fps via the performance manager's quality-scaling when resources are constrained. Round transition UI latency target: 250 ms; hotkey toggle latency: <100 ms.  
**Constraints**: Follow Constitution limits: prefer files ≤ 300 LOC, TDD-first, separate rendering from simulation logic (renderers read-only), avoid heavy computations in render loop (prefer precomputed selectors or worker offload). Limit new transitive dependencies; prefer Drei and existing project utilities.  
**Scale/Scope**: Small feature: roughly 5–10 focused components plus hooks/selectors and test suites. No new backend APIs required.

## Constitution Check

GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.

We perform a pre-check against the RobotSpaceBattler Constitution (v1.0.1):

- Principle II — Test-First (TDD): PASS (spec enumerates Gate-0 failing tests; plan mandates authoring failing unit & integration tests before implementation).  
- Principle I & III — Component & Size Limits: PASS (design emphasizes small components, hooks, and selectors; if a file exceeds 300 LOC we will extract utilities and add unit tests documenting behavior).  
- Principle IV — React & r3f Best Practices: PASS (render components will be pure and consume read-only state; use of useFrame will be limited and documented; Drei utilities preferred; assets loaded through Suspense/loader).  
- Principle V — Observability & Performance: PASS (existing perf harness in Playwright and performance manager will be used; we will add structured metrics and a perf test plan).  
- Principle VI — Dependency Hygiene: PASS (no new runtime dependencies planned; use existing libraries. Any new dependency requires PR-level justification and dependency audit).  

If any of the above become unavoidable (for example, a new cross-platform runtime dependency to enable a required visual diff tool), we will document the violation in the plan with explicit justification and mitigation steps.

## Project Structure

Documentation (this feature):

```text
specs/002-3d-simulation-graphics/
├── plan.md              # This file (filled)
├── research.md          # Phase 0 findings & decisions
├── data-model.md        # Phase 1: entity shapes and validation rules
├── quickstart.md        # How to run / test this feature locally and CI
├── contracts/           # Adapter/selector contracts and schemas
└── tasks.md             # Phase 2 tasks (TBD after Phase 1)
```text

Source layout (frontend):

```
src/
├── components/
│   └── battle/
│       ├── BattleUI.tsx         # Top-level in-round UI (small composition)
│       ├── RobotOverlay.tsx      # Per-robot overlay shown when following
│       └── index.ts
├── hooks/
│   └── useBattleHudData.ts       # Pure selectors/adapters for UI (read-only)
├── selectors/
│   └── battleSelectors.ts        # Selector helpers that bridge ECS -> UI
├── systems/
│   └── uiAdapter.ts              # Lightweight read-only adapter (no authoritative logic)
tests/
├── unit/
│   └── battle-ui.test.tsx
└── integration/
    └── battle-selectors.test.ts
playwright/
└── tests/
    └── battle-ui.spec.ts
```

**Structure Decision**: Implement feature inside `src/components/battle` and reusable selectors/hooks in `selectors/` and `hooks/` so renderers remain small and purely presentational. Reuse `src/store/uiStore.ts` for global UI toggles and expose a thin adapter for match/robot-specific read-only data.

## Complexity Tracking

No constitution violations are planned. If any are introduced, they will be recorded here with a justification and an explicit migration plan.

## Phase 0: Outline & Research (deliverable: research.md)

Goals:

1. Resolve remaining technical unknowns (testing approach for visual diffs, exact instrumentation for performance tests, and fallback behaviors for devices without GPU acceleration).  
2. Produce a short set of decisions and alternatives that drive Phase 1 design (data model + contracts + test plan).  

Planned research tasks (created as separate tickets):

- Research visual-diff pipeline options compatible with Playwright: SSIM (image-based) vs pixelmatch tolerant diffs — pick SSIM ≥ 0.97 as default and validate CI performance cost.  
- Confirm Playwright accessibility snapshot strategy and how to integrate toMatchAriaSnapshot into CI triage flow.  
- Benchmark the performance manager hooks to validate quality-scaling knobs (LOD, particle density, shadow toggles) and determine safe defaults.  

Deliverable: `research.md` (this spec's research artifact)

## Phase 1: Design & Contracts (deliverables: data-model.md, contracts/*, quickstart.md)

Prerequisites: `research.md` complete.

1. Data model: define minimal UI-facing shapes (Round, Robot view model, CameraState, UIState) in `data-model.md`.  
2. Contracts: define the internal adapter contract between simulation systems and UI (selectors, events, and JSON schemas) inside `contracts/`.  
3. Quickstart: document how to run the feature locally, run unit and E2E tests, and how to reproduce the QA lab perf tests.  
4. Update agent context (copilot) using `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot` so agent helpers are aware of the new feature and its tech stack.  

## Phase 2 (outline)

1. Implement failing tests (Gate 0).  
2. Implement minimal UI components to satisfy the tests.  
3. Iterate on performance knobs and CI visual-diff thresholds.  

## Deliverables (Phase 0/1)

- `specs/002-3d-simulation-graphics/research.md`  
- `specs/002-3d-simulation-graphics/data-model.md`  
- `specs/002-3d-simulation-graphics/contracts/ui-adapter-contract.md`  
- `specs/002-3d-simulation-graphics/contracts/ui-state.schema.json`  
- `specs/002-3d-simulation-graphics/quickstart.md`

