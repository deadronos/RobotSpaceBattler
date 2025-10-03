# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Execution Flow (/plan command scope)
```text
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
   (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot,
   `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
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

Primary requirement: implement a deterministic, fixed-step Simulation subsystem (AI, Weapons,
Hitscan/Beam/Projectile, Damage, Scoring, Respawn, PhysicsSync, FX) that is reproducible under a
seeded FixedStepDriver and adheres to the repository constitution (Physics-First,
Deterministic Simulation, TDD, Small Composable Systems, ECS-Driven, On-Demand Rendering).

Technical approach: Enforce StepContext-driven timing and RNG across systems. Implement a
deterministic ID strategy and a bounded in-memory runtime event log. Update ScoringSystem and
RespawnSystem to perform deterministic classification, scoring, and respawn timing (default
5000ms delay, 2000ms invulnerability). Remove module-scoped non-deterministic counters and
UI-store reads inside simulation systems. Add a test-mode entrypoint for Simulation to inject
FixedStepDriver or simNowMs for tests. Update useFixedStepLoop to accumulate elapsed time per
render frame.

## Technical Context

- Language/Version: TypeScript (project uses existing TypeScript + React + Vite toolchain)

- Node: Node 18+ (per repository quickstart)

- Primary Dependencies: React, three.js, @react-three/rapier, miniplex (ECS), zustand (UI),
  Vitest (unit tests), Playwright (E2E)

- Adapting existing codebase: This plan adapts an existing frontend codebase implemented in
  TypeScript using react-three-fiber (r3f), drei helpers, Three.js, Vite, miniplex ECS,
  zustand for UI state, and Rapier physics. Implementation tasks should modify and extend
  existing systems (`src/systems/*`, `src/components/Simulation.tsx`) rather than scaffold
  new standalone apps.

  Library docs and deeper dependency information are available in the repository at
  `docs/DEPENDENCIES.md` — consult that file when updating integrations or choosing API
  usage patterns (for example, Rapier raycasts and react-three-rapier patterns).

- Storage: N/A (in-memory runtime structures only for this feature)

- Testing: Vitest for unit tests and integration tests; Playwright for E2E smoke tests

- Target Platform: Web (single-page application) — browser environment

- Project Type: Single frontend project (source under `src/`), tests under `tests/` and
  `playwright/tests/`

- Performance Goals: Support up to 500 active entities; aim for <16ms per fixed-step under
  target conditions; benchmark in IT-003

- Constraints: Must preserve Physics-First Authority; systems MUST be deterministic given
  StepContext; test-driven development enforced

- Scale/Scope: Up to 500 active entities (robots + projectiles + beams)

## Constitution Check

- Initial Constitution Check: PASS — planned changes align with constitution principles:
  - Physics-First: Rapier RigidBody remains authoritative; PhysicsSyncSystem required to
    copy transforms.

  - Deterministic Simulation: All systems will consume StepContext.rng and StepContext.simNowMs.
    Simulation-critical code MUST not use Date.now() or Math.random(). Systems will be
    updated to accept StepContext for timing and RNG to guarantee determinism across tests
    and replay runs.

  - Test-Driven Development: plan includes unit and integration tests before/alongside
    implementation.
  - Small, Composable Systems: changes favor injecting flags/StepContext and ID factories
    rather than global state access.
  - ECS-Driven Architecture & On-Demand Rendering: design keeps ECS as authoritative and
    maintains demand rendering.

No constitution violations identified that prevent implementation; complexity table left empty.

## Structure Decision

Selected structure: Single frontend project (use Option 1). Implement feature modifications
in these real paths:

- Simulation orchestration & hooks: src/components/Simulation.tsx
- Hooks & driver: src/hooks/useFixedStepLoop.ts, src/utils/fixedStepDriver.ts
- Systems: src/systems/ (ScoringSystem.ts, RespawnSystem.ts, ProjectileSystem.ts,
  BeamSystem.ts, FxSystem.ts)
- ECS & helpers: src/ecs/ (miniplexStore.ts, pauseManager.ts)
- Tests: tests/ and playwright/tests/

## Phase 0 & 1 Status (plan execution)

- [x] Phase 0: Research complete (/plan command)
  - Artifact: specs/001-title-simulation-spec/research.md

- [x] Phase 1: Design complete (/plan command)
  - Artifacts:
    - specs/001-title-simulation-spec/data-model.md
    - specs/001-title-simulation-spec/quickstart.md
    - specs/001-title-simulation-spec/contracts/scoring-contract.md
    - specs/001-title-simulation-spec/contracts/respawn-contract.md
    - specs/001-title-simulation-spec/contracts/observability-contract.md

- [ ] Phase 2: Task planning complete (/tasks command)
- [ ] Phase 3: Tasks generated
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

## Gate Status

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (none required)

## Phase 2: Task planning approach (what /tasks will generate)

- Follow TDD ordering: generate tests first (unit tests for ScoringSystem, RespawnSystem,
  ProjectileSystem; integration test SimulationIntegration.test.tsx), then small implementation
  tasks that make tests pass.

- Prioritize high-severity patches (Scoring, Respawn, Simulation wiring, runtimeEventLog), then
  medium (ID fixes, FxSystem, BeamSystem), then low (docs, quickstart updates).

- Tasks will be split into small commits (one system + tests per task) to keep changes reviewable
  and reversible.

- Estimated total tasks: 20–35, with ~8 high-priority tasks for immediate correctness.

  Note: Generated artifacts (specs, plans, contracts, data-model files) MUST be authored
  with hard-wrap at 100 characters and must preserve blank lines around lists. This
  ensures consistent formatting across environments and satisfies repository linting
  recommendations.

## Artifacts produced by the /plan run

- specs/001-title-simulation-spec/spec.md (updated with clarifications)
- specs/001-title-simulation-spec/plan.md (this file)
- specs/001-title-simulation-spec/research.md
- specs/001-title-simulation-spec/data-model.md
- specs/001-title-simulation-spec/quickstart.md
- specs/001-title-simulation-spec/contracts/scoring-contract.md
- specs/001-title-simulation-spec/contracts/respawn-contract.md
- specs/001-title-simulation-spec/contracts/observability-contract.md


- Run `/tasks` to generate tasks.md (Phase 2) and review the ordered TDD tasks.

- Or, if preferred, start implementing high-priority patches now. Suggested first
  implementation task: update `src/systems/ScoringSystem.ts` to implement deterministic
  classification, scoring deltas, and append audit entries to a new
  `src/utils/runtimeEventLog.ts`.
