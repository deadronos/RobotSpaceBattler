# Spec & Concept — Project-level spec summary

This file summarizes the current authoritative specification artifacts and provides a concise, high-level summary of the Simulation feature spec located at `specs/001-title-simulation-spec/spec.md`.

## Current summary: Simulation feature (specs/001-title-simulation-spec/spec.md)

- Purpose: Define concrete, testable functional requirements and user stories for the Simulation subsystem. Scope includes the deterministic fixed-step simulation loop and its core systems: AI, Weapon resolution (hitscan, beam, projectile), Damage, Scoring, Respawn, Physics synchronization, and Visual FX.

- Key properties required by the spec:
  - Determinism: a seeded fixed-step driver and per-step RNG guarantee reproducible behavior for unit and integration tests.
  - Physics-First: Rapier (or equivalent) rigid bodies are authoritative for entity transforms; rendering must sync from physics rather than mutate meshes directly.
  - Event-driven systems: WeaponSystem emits WeaponFiredEvent; resolver systems (Hitscan, Beam, Projectile) emit DamageEvents; DamageSystem, ScoringSystem, and RespawnSystem consume events to update game state.
  - Testability: All new behavior must include unit and deterministic integration tests that validate event sequences and numerical outcomes (golden traces where applicable).
  - Robustness: Systems must provide deterministic fallbacks when physics APIs are unavailable in test environments and preserve sourceId/owner semantics for projectiles.

- Acceptance criteria examples:
  - Reproducible event traces for identical seeds and initial states.
  - Correct damage resolution for hitscan, beam ticks, and projectile AoE (including friendly-fire behavior and additive overlaps).
  - PhysicsSync must update ECS positions only when threshold changes occur and notify render subscribers.
  - Scoring and respawn behaviors must process DeathEvents deterministically.

- Outstanding clarifications captured in the spec: respawn timing/placement, scoring rules for suicides/assists/friendly-fire, performance targets (entity counts), deterministic event logging/serialization, and networking/serialization expectations.

## How to maintain this file
- When new specs are created under `specs/` or `.specify/`, update this summary to include their purpose and high-level acceptance criteria.
- Keep this file intentionally brief — it should point readers to the authoritative spec files for details and test matrices.
- Suggested workflow for updates: add or update spec files in `specs/` then update SPEC.md with a one-paragraph summary per new or changed spec, and list any action items (tests, policy clarifications, performance targets).
