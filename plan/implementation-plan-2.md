
# Implementation Plan B — Parallel Teams & Pipeline-First

Overview

- Strategy: Organize work into parallel tracks (Core Engine, Tools & Assets, AI & Gameplay) and invest early in automation (CI/CD, tests, preview builds). Each milestone advances in all tracks where possible to reduce end-to-end integration risk.

- Timeline assumption: team of 6–10 engineers; two-week sprints; dedicated DevOps engineer.

Track Responsibilities

- Core Engine: physics, ECS, renderer integration, performance.

- AI & Gameplay: AI behaviors, weapons, damage systems, game rules.

- Tools & Assets: prefab tools, asset pipeline, pipeline integration, visual polish.

- DevOps/QoS: CI/CD, Playwright E2E, perf regression tracking.

Milestone 01 — Kickoff & Project Scaffolding

- Parallel tasks:

  - Core Engine: scaffold Vite + TypeScript project, add Three.js and Rapier skeleton.

  - DevOps: create CI template with lint/test steps and preview deployments for branches.

  - Tools: establish asset folder structure and naming conventions.

- Acceptance criteria: baseline repo with CI; branch preview deploys; contributors can run dev server.

Milestone 02 — Robot Generation & Prefabs

- Parallel tasks:

  - Core Engine: procedural prefab API and ECS component definitions.

  - Tools: build a small prefabs inspector (dev-only) to iterate visually.

  - AI: define initial data-driven behavior parameters for prefabs.

- Acceptance criteria: prefabs are data-driven; prefabs inspector lists variants and spawns them.

Milestone 03 — Physics Integration

- Parallel tasks:

  - Core Engine: Rapier integration, RigidBody wrappers, and collision matrix.

  - DevOps: add headless physics tests in CI and baseline perf measurement.

  - AI: add movement controllers that read physics velocities from bodies.

- Acceptance criteria: physics tests pass in CI; movement controllers stable.

Milestone 04 — AI Behaviors

- Parallel tasks:

  - AI: implement behavior trees/state machines and perception modules (LOS, range checks).

  - Core Engine: expose debug hooks and telemetry for AI ticks.

  - Tools: add visualization overlays for AI perception in dev inspector.

- Acceptance criteria: AI telemetry visible; automated tests for decision logic.

Milestone 05 — Weapons Architecture

- Parallel tasks:

  - AI: define weapon usage patterns and AI firing heuristics.

  - Core: implement weapon execution pipelines (projectile pooling, hitscan immediate resolution).

  - Tools: create weapon editor for tweaking parameters and running short scenarios.

- Acceptance criteria: weapons configurable via editor; integration tests show consistent firing behavior.

Milestone 06 — Damage & Health Systems

- Parallel tasks:

  - Core: authoritative damage resolution, health components, scoring.

  - AI: add tactical responses to health changes (retreat when low).

  - DevOps: create CI smoke tests that validate scoring and respawn logic.

- Acceptance criteria: scoring and respawn behave correctly in smoke runs.

Milestone 07 — Environments & Visuals

- Parallel tasks:

  - Tools: asset pipeline (glTF), import hooks, validation scripts.

  - Core: environment collision and occlusion baked into physics layer.

  - AI: nav heuristics that use obstacle info.

- Acceptance criteria: assets load through pipeline; environment affects LOS/AI paths.

Milestone 08 — Assets Pipeline & Replacement of Placeholders

- Parallel tasks:

  - Tools: final asset pipeline integration with caching and lazy loading.

  - DevOps: add asset presence checks to CI and a small CDN preview for demo builds.

  - Core: swap placeholders with glTF prefabs; ensure LODs and memory budgets.

- Acceptance criteria: asset pipeline works on CI; demo build uses final assets.

Milestone 09 — Testing, Determinism & Performance

- Parallel tasks:

  - DevOps: ramp up test coverage, add deterministic simulation tests and perf regressions to CI.

  - Core: optimize hot loops, add object pooling for projectiles, reduce GC pressure.

  - AI: ensure deterministic mode for headless runs; seed RNG centrally.

- Acceptance criteria: deterministic test runs stable; perf baselines met or documented.

Milestone 10 — Release, Docs & Demo

- Parallel tasks:

  - DevOps: final release pipeline, tagging, and preview site.

  - Docs: finalize `SPEC.md`, `README.md`, and dev onboarding.

  - Product: prepare demo scenario and video assets.

- Acceptance criteria: deployable demo, clear docs, and release tag on main.

Risks & Mitigations

- Integration complexity — Mitigation: parallel tracks but enforced integration sprints and cross-team demos each sprint.

- Asset pipeline friction — Mitigation: automated validation and clear asset spec docs.

Deliverables & Observability

- Deliverables per sprint: preview builds, test reports, artifacted performance profiles, and a short demo recording.

