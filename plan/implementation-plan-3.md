
# Implementation Plan C — MVP-First with Feature Flags

Overview

- Strategy: Deliver a small, playable MVP quickly then iterate by enabling features behind flags. Prioritize player feedback, short loops, and stable public demos. Keep feature flags and toggles in code and UI so we can A/B test and roll back risky features.

- Timeline assumption: team of 3–6 engineers; fast feedback loops; product-driven priorities.

Milestone 01 — Kickoff & Project Scaffolding (MVP baseline)

- Goal: Build the smallest playable app: one robot per side, basic controls, and a visible health bar.

- Tasks:

  - Scaffold Vite + TypeScript app and minimal scene.

  - Add a feature-flag system (simple `useFeature('deterministicMode')` hook backed by config).

  - Create CI with lint and test; add Playwright smoke that verifies MVP flow.

- Acceptance criteria: MVP runs locally and in CI; feature-flag toggles present.

Milestone 02 — Robot Generation & Prefabs (MVP variants)

- Goal: Provide a few robot variants to make the MVP varied.

- Tasks:

  - Implement `robotPrefab.tsx` with 3 variants and data-driven load.

  - Add a simple variant selector in the UI behind a feature flag.

- Acceptance criteria: variants selectable and spawnable; tests validate prefab integrity.

Milestone 03 — Physics Integration (MVP-safe)

- Goal: Add light-weight physics for movement and collisions.

- Tasks:

  - Integrate Rapier but keep deterministic mode optional via feature flag.

  - Provide a non-physics fallback (kinematic movement) for low-power devices.

- Acceptance criteria: MVP stable on low-end devices; deterministic mode works in headless CI.

Milestone 04 — AI Behaviors (MVP bot)

- Goal: Implement a small, fun bot behavior for MVP: approach target and shoot.

- Tasks:

  - Implement simple state machine (Seek -> Attack -> Idle) behind a feature flag.

  - Add telemetry for hit rates and time-to-kill for quick iteration.

- Acceptance criteria: bots engage the player and metrics track combat effectiveness.

Milestone 05 — Weapons Architecture (MVP weapons)

- Goal: Add one hitscan and one projectile weapon for MVP.

- Tasks:

  - Implement hitscan and a simple projectile with pooling.

  - Keep advanced beams and AOE behind flags.

- Acceptance criteria: both weapons work in MVP and are toggleable.

Milestone 06 — Damage & Health Systems (MVP)

- Goal: Health, damage, and respawn minimal implementation.

- Tasks:

  - Implement Health component and simple DamageSystem.

  - Add respawn timer and minimal scoring UI.

- Acceptance criteria: MVP match runs end-to-end and scoring visible.

Milestone 07 — Environments & Visuals (MVP polish)

- Goal: Add one playable map and basic lighting.

- Tasks:

  - Create a single map with a few obstacles that affect LOS.

  - Add simple post-processing and UI polish for the MVP.

- Acceptance criteria: map plays well and is referenced in demo scripts.

Milestone 08 — Assets Pipeline & Replacement (MVP asset swap)

- Goal: Replace placeholders only where they improve the MVP experience.

- Tasks:

  - Integrate minimal glTF assets for the player robot and one environment prop.

  - Ensure lazy-loading and fallback to procedural models on failure.

- Acceptance criteria: MVP assets load and fall back gracefully.

Milestone 09 — Testing, Determinism & Performance

- Goal: Make the MVP testable and reproducible for metrics.

- Tasks:

  - Add deterministic RNG and headless simulation tests for core flows.

  - Add performance budget checks to CI for the demo scene.

- Acceptance criteria: deterministic runs reproduce numbers; perf checks pass or are documented.

Milestone 10 — Release, Docs & Demo

- Goal: Public MVP release and feedback collection.

- Tasks:

  - Build and deploy MVP demo to a preview site; add analytics and feedback link.

  - Document feature flags and roadmap for unlocking features.

- Acceptance criteria: playable demo live and feedback coming in; plan for next sprint prioritized.

Feature Flagging & Rollout Strategy

- Implement a simple feature flag hook with three sources:

  - local dev config, env var for CI, and remote override (later)

- Use flags for deterministic mode, beam weapons, advanced physics, and asset-heavy features.

Risks & Mitigations

- Risk: Rushed MVP has brittle systems — Mitigation: keep scope minimal and put risky features behind flags.

Deliverables & Observability

- Short-lived demo builds, simple telemetry for combat metrics, and a prioritized backlog for next features.

