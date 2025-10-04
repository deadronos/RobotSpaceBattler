<!--
Sync Impact Report:
Version change: TEMPLATE → 1.1.0 (Initial constitution created, updated for Spec Kit workflow)
Modified principles: N/A (Initial creation)
Added sections:
  - I. Physics-First Authority
  - II. Deterministic Simulation
  - III. Test-Driven Development
  - IV. Small, Composable Systems
  - V. ECS-Driven Architecture
  - VI. On-Demand Rendering
  - Integration Testing Focus Areas
  - Development Workflow
Removed sections:
  - Memory Bank Synchronization (replaced by Spec Kit workflow in .specify/)
Templates requiring updates:
  ✅ Constitution created (this file)
  ✅ Aligned with Spec Kit workflow using .specify/ folder structure
  ⚠ Pending: Ensure `AGENTS.md` and `.github/copilot-instructions.md` reference constitution principles
Follow-up TODOs: None
-->

# RobotSpaceBattler Constitution

## Core Principles

### I. Physics-First Authority (NON-NEGOTIABLE)

Rapier `RigidBody` is the authoritative source of truth for all transforms of physics-driven entities.

**Rules:**

- MUST NOT mutate mesh transforms (position, rotation) directly when a `RigidBody` component exists on an entity.
- MUST use Rapier APIs (`setLinvel`, `setAngvel`, `applyImpulse`) to adjust motion.
- MUST synchronize ECS position/rotation components from Rapier state via `physicsSyncSystem` each frame.
- Systems that need transform values MUST read from `RigidBody` translation/rotation APIs during physics sync.

**Rationale:** Direct mesh manipulation while physics bodies exist causes desynchronization between
visual state and physical state, leading to unpredictable behavior, collision detection failures, and
non-reproducible bugs. Physics-first authority ensures consistent, testable simulation behavior.

### II. Deterministic Simulation

The simulation MUST be deterministic and reproducible using a fixed-step loop with seeded random number generation.

**Rules:**

- MUST use `useFixedStepLoop` with a fixed timestep (default 1/60s = 16.67ms) for all game logic systems.
- MUST use the provided seeded RNG (from `StepContext.rng`) for all random decisions in systems (AI, weapons, spawn variations).
- MUST NOT use `Math.random()`, `Date.now()`, or other non-deterministic APIs inside simulation systems.
- Systems MUST receive `StepContext` containing `{ frameCount, simNowMs, rng, step }` and use these values exclusively.
- Unit tests that verify behavior MUST use the fixed-step driver or test helpers to reproduce identical execution traces.

**Rationale:** Deterministic simulation enables reproducible unit tests, debugging by replay, and
verification of behavioral correctness. Non-deterministic sources break test reliability and make bugs
impossible to reproduce consistently.

### III. Test-Driven Development (NON-NEGOTIABLE)

All systems and core logic MUST be test-covered with automated unit tests (Vitest) and integration
validation (Playwright E2E).

**Rules:**

- Systems MUST export pure, testable functions that can be unit tested without Three.js or Rapier initialization.
- MUST write unit tests for new systems, components, and logic before or during implementation.
- MUST run `npm run lint && npm run format && npm run test` before submitting pull requests.
- Critical flows (weapon → projectile → damage, AI decision logic, physics sync) MUST have explicit unit test coverage.
- Playwright smoke tests MUST validate core rendering, spawning, and UI interactions (pause, friendly-fire toggle).
- Test files live in `tests/` directory and follow naming convention `*.test.ts` or `*.test.tsx`.

**Rationale:** Test-driven development catches regressions early, documents intended behavior, enables
confident refactoring, and ensures that changes don't silently break existing functionality. Testability
forces better system design.

### IV. Small, Composable Systems

Systems MUST be small, focused, and composed of reusable helper functions to maintain clarity and testability.

**Rules:**

- Systems MUST have a single, well-defined responsibility (e.g., `aiSystem` handles AI decisions;
  `weaponSystem` manages cooldowns and firing events).
- Large system files (>300 lines) SHOULD be refactored into smaller modules with exported helpers.
- Systems MUST emit events (via event arrays) rather than performing large imperative side-effects inline.
- Helper functions SHOULD be extracted into separate modules (e.g., `src/systems/ai/queries.ts`,
  `src/systems/ai/perception.ts`) for reuse and testing.
- Avoid deep nesting and god-classes; prefer flat, composable functions.

**Rationale:** Small systems are easier to understand, test, debug, and refactor. Composability reduces
duplication and makes it easier to reason about data flows. Event-driven architecture decouples producers
from consumers.

### V. ECS-Driven Architecture

The Entity-Component-System (ECS) pattern using `miniplex` is the authoritative data model for simulation state.

**Rules:**

- Entities MUST be managed through the `miniplex` world (via `miniplexStore.world`).
- Components MUST be plain data objects (no methods); behavior lives in systems, not components.
- Systems MUST iterate over entity queries and perform logic based on component data.
- Entity lifecycle (creation, destruction) MUST notify `entityLookup` subscribers so React rendering can invalidate.
- Render components (React/Three.js) MUST read from ECS state, not maintain separate state.
- Use `createRobotEntity`, `createProjectileEntity`, and similar factory functions for consistent entity initialization.

**Rationale:** ECS provides a clear separation between data (components) and logic (systems), enabling
testability, modularity, and performance optimization. Centralizing state in the ECS prevents
desynchronization bugs between simulation and rendering.

### VI. On-Demand Rendering

Rendering MUST use an on-demand frameloop (`frameloop="demand"`) driven explicitly by simulation state
changes to minimize unnecessary GPU work and ensure deterministic pause behavior.

**Rules:**

- The `Canvas` MUST use `frameloop="demand"` (configured in `src/components/Scene.tsx`).
- MUST use `TickDriver` component to schedule render frames at a target Hz (default 60Hz) when simulation is running.
- Components that mutate ECS state MUST call `invalidate()` to trigger a render frame.
- `entityLookup.notify()` and subscription callbacks MUST call `invalidate()` when entities are added/removed/modified.
- Pause/unpause behavior MUST be deterministic: pausing stops the fixed-step driver; unpausing resumes
  with captured velocities restored.

**Rationale:** On-demand rendering reduces CPU/GPU usage when the simulation is paused or idle, improves
battery life on mobile/laptops, and makes pause behavior predictable and testable. Explicit invalidation
clarifies when and why frames are rendered.

## Integration Testing Focus Areas

The following areas MUST have integration test coverage due to their cross-system dependencies:

1. **Physics-ECS Synchronization**
   - Verify `physicsSyncSystem` correctly copies Rapier transforms to ECS components.
   - Tests: `r3f-ecs-sync.test.tsx`, `useEntityPhysicsSync.test.tsx`

2. **Weapon Resolution Flows**
   - Verify weapon → projectile/hitscan/beam → damage → death flows with correct `sourceId` propagation.
   - Verify friendly-fire toggle behavior.
   - Tests: `weapon-projectile-behavior.test.ts`, `projectile-friendly-fire.test.ts`, `weapon-fire-smoke.test.ts`, `hitscan-determinism.test.ts`

3. **AI Behavior**
   - Verify AI target selection, steering decisions, and weapon firing using deterministic RNG.
   - Tests: `ai-decisions.test.ts`, `ai-perception.test.ts`, `ai-queries.test.ts`

4. **Pause/Resume State Management**
   - Verify pause captures velocities and resume restores them correctly.
   - Tests: `pauseVelocity.test.ts`, `pauseManager.test.ts`

5. **Simulation Bootstrap & Rendering**
   - Verify entity spawning, query initialization, and React rendering integration.
   - Tests: `initial-ecs-hydration.test.ts`, `SimulationIntegration.test.tsx`, `r3f-simulation-render.test.tsx`
   - E2E: `playwright/tests/smoke.spec.ts`

## Development Workflow

### Pre-Commit Quality Gates

Before committing changes, developers MUST:

1. Run linter: `npm run lint`
2. Run formatter: `npm run format`
3. Run unit tests: `npm run test` (or `npm run test:watch` during development)
4. Fix all errors and warnings before proceeding.

### Pull Request Requirements

Pull requests MUST:

1. Include unit test coverage for new systems or logic changes.
2. Include Playwright E2E validation if the change affects rendering, spawning, or UI interactions.
3. Update `.specify/` documentation (specs, plans, tasks) if architectural patterns or system responsibilities change.
4. Update `SPEC.md` if the change alters system boundaries, physics authority model, or core simulation behavior.
5. Pass all CI checks (lint, format, unit tests, E2E tests).
6. Include a clear description linking to relevant tasks or specs.

### Performance Standards

- Fixed-step simulation MUST maintain 60Hz (16.67ms per step) under normal load (20 entities, 3 systems active).
- Frame rendering SHOULD maintain 60fps when on-demand rendering is active.
- Avoid allocations inside tight loops (use object pooling for projectiles when necessary).
- Use `collectSceneMetrics` utility to validate draw calls, triangle counts, and texture memory usage.

## Governance

This constitution supersedes all other project practices and conventions. All contributors, maintainers,
and AI agents MUST adhere to these principles.

### Amendment Procedure

1. Amendments MUST be proposed via pull request with clear rationale.
2. Breaking changes (MAJOR version bump) require:
   - Documentation of affected systems and migration path.
   - Approval from project maintainer.
   - Update to all dependent templates and guidance files.
3. Minor changes (new principles, expanded guidance) increment MINOR version.
4. Clarifications and typo fixes increment PATCH version.

### Compliance Review

- All pull requests MUST be reviewed for compliance with constitution principles.
- Violations MUST be justified explicitly or corrected before merge.
- Use `.github/copilot-instructions.md` and `AGENTS.md` for runtime development guidance; these files
  SHOULD reference this constitution.

### Versioning Policy

- Version format: `MAJOR.MINOR.PATCH`
- MAJOR: Backward-incompatible governance changes, principle removals/redefinitions.
- MINOR: New principles, materially expanded guidance, new sections.
- PATCH: Clarifications, wording improvements, non-semantic refinements.

**Version**: 1.1.0 | **Ratified**: 2025-10-03 | **Last Amended**: 2025-10-03
