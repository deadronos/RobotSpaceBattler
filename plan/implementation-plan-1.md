
# Implementation Plan A — Incremental & Iterative

Overview

- Strategy: Ship the project milestone-by-milestone in small, testable increments. Each milestone is a focused delivery with clear acceptance criteria and automated tests. Prioritize correctness, maintainability, and observability.

- Timeline assumption: team of 2–4 engineers, continuous integration in place. Typical milestone cadence: 1–3 weeks depending on complexity.

Milestone 01 — Kickoff & Project Scaffolding

- Goal: Initialize repository, developer workflows, basic CI, and a minimal playable scene.

- Tasks:

  - Create project scaffolding (Vite + React + TypeScript) — ensure `npm install` works and dev server runs.

  - Add CI pipeline: install node, cache dependencies, run lint, run unit tests.

  - Create minimal Canvas scene and Simulation bootstrap that renders a status UI (loading, paused).

  - Add CONTRIBUTING.md, AGENTS.md and project brief to root.

- Dependencies: none (bootstrap step).

- Acceptance criteria: dev server runs locally; CI runs lint/tests; README describes dev workflow.

- Tests: smoke test (Playwright) that loads the page and asserts `#status` and `canvas` exist.

Milestone 02 — Robot Generation & Prefabs

- Goal: Procedural robot prefabs and robot spawning system.

- Tasks:

  - Implement `robots/robotPrefab.tsx` with modular parts.

  - Add spawn system in `Simulation.tsx` with ECS entity creation.

  - Expose spawn controls in UI (dev-only toggles).

- Dependencies: Milestone 01.

- Acceptance criteria: Robots spawn in scene; spawn UI toggles work; unit tests cover prefab generation.

- Tests: unit tests for prefab transforms and spawn count invariants.

Milestone 03 — Physics Integration

- Goal: Integrate Rapier physics and make RigidBody authoritative for transforms.

- Tasks:

  - Add `@react-three/rapier` wrapper and ensure objects have `RigidBody` components.

  - Implement collision groups and layers for teams and environment.

  - Ensure transform sync: Rapier -> ECS reactor.

- Dependencies: Milestone 02.

- Acceptance criteria: Robots respond to physics, collisions detected in systems, no transform desync warnings.

- Tests: deterministic physics unit tests (small timestep simulation with seeded RNG).

Milestone 04 — AI Behaviors (Core Systems)

- Goal: Implement core AI systems (movement, targeting, basic decision tree) and per-frame system wiring.

- Tasks:

  - Implement AI tick loop with fixed timestep and capped CPU budget per frame.

  - Create simple state machine: Idle -> Patrol -> Engage -> Flee.

  - Add targeting system to pick nearest enemy within range and line-of-sight checks.

- Dependencies: Milestone 03.

- Acceptance criteria: Robots switch states and engage other robots; debug UI shows AI state per entity.

- Tests: unit tests for decision outputs using seededRng and deterministic scenarios.

Milestone 05 — Weapons Architecture

- Goal: Design and implement modular weapon primitives (hitscan, projectile, beam).

- Tasks:

  - Define weapon component schema in `ecs/weapons.ts` and implement `WeaponSystem`.

  - Implement `HitscanSystem`, `ProjectileSystem`, and `BeamSystem` as separate modules.

  - Add cooldown, ammo, and firing arcs.

- Dependencies: Milestone 04.

- Acceptance criteria: Weapons can be attached to robots and fire according to config; visuals show hits and effects.

- Tests: unit tests for damage application, cooldown behavior, projectile AOE.

Milestone 06 — Damage & Health Systems

- Goal: Implement health, damage resolution, team scoring, and death/respawn.

- Tasks:

  - Add `Health` component and `DamageSystem` that applies damage and triggers events.

  - Implement respawn logic and scoring system.

  - Add simple UI for health bars and team scores.

- Dependencies: Milestone 05.

- Acceptance criteria: Damage reduces health, entities die and respawn, scoring increments correctly.

- Tests: tests for damage math, AOE edge cases, and respawn timing.

Milestone 07 — Environments & Visuals

- Goal: Add richer environment, lighting, and visual polish for debugging and play.

- Tasks:

  - Create environment prefabs and static obstacles that affect line-of-sight.

  - Add post-processing, shadows, and performance-friendly LODs.

  - Add diagnostic visuals (axis, bounding boxes) togglable from Dev UI.

- Dependencies: Milestone 03 & 06.

- Acceptance criteria: Scenes render with stable framerate; visual toggles available.

- Tests: visual smoke test, run headless rendering to ensure no runtime errors.

Milestone 08 — Assets Pipeline & Replacement of Procedural Placeholders

- Goal: Replace procedural placeholders with reusable assets and glTF pipeline.

- Tasks:

  - Add asset import pipeline and small asset store.

  - Implement lazy-loaded glTF models with progress indicators.

  - Add tooling notes for art team (scale, pivot, naming conventions).

- Dependencies: Milestone 02 & 07.

- Acceptance criteria: Assets load and replace placeholders without breaking systems.

- Tests: CI checks that assets referenced in code exist and loading produces no errors.

Milestone 09 — Testing, Deterministic Modes & Perf

- Goal: Harden tests and add deterministic game-mode for reproducible AI tests.

- Tasks:

  - Create deterministic RNG utility (`utils/seededRng.ts`) and add deterministic AI test mode.

  - Add more unit tests for AI, weapons, and physics; increase coverage for core systems.

  - Run performance profiling; fix hot paths in systems.

- Dependencies: Milestone 01–08.

- Acceptance criteria: Tests are stable; deterministic runs reproduce behavior; perf targets met (e.g., 60fps on target machines or acceptable fallback modes).

- Tests: deterministic simulation tests, CI test coverage threshold.

Milestone 10 — Release, Docs & Demo

- Goal: Final polish, documentation, package, and public demo build.

- Tasks:

  - Final build scripts and optimize bundle size.

  - Update `README`, `SPEC.md`, and runtime docs for contributors.

  - Create a playable demo page and a short video walkthrough.

- Dependencies: All previous milestones.

- Acceptance criteria: Production build passes smoke checks; demo is deployable.

- Tests: final end-to-end smoke (Playwright) and a checklist for PR review.

Risks & Mitigations

- Risk: Physics/visual desync — Mitigation: Rapier-driven transforms + tests.

- Risk: Complexity growth — Mitigation: keep systems small, add code owners, and enforce API boundaries in `SPEC.md`.

Deliverables & Observability

- Deliverables: per-milestone changelogs, release tags, automated CI runs, Playwright smoke tests, and unit test suites.

