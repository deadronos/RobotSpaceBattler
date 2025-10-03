# Phase 0 — Research

Date: 2025-10-03

Decisions captured from Clarifications session:

- Scoring: Full scoring rules (team +1 for opponent kills; suicide −1 to killer's team;
  friendly-fire −1 to attacker). ScoringSystem must append a bounded in-memory audit entry
  for each death.

- Respawn: Default respawn delay = 5000ms; respawn grants 2000ms invulnerability; spawn
  queue must prevent overcrowding; proximity-avoidance is desirable but deferred to Phase
  2/implementation.

- Deterministic IDs: Use deterministic-prefix+UUID for rendering IDs; gameplay and
  serialization IDs must be deterministic (derived from simNowMs, frameCount, and step RNG).

- Fixed-step loop: `useFixedStepLoop` must accumulate elapsed time and run multiple fixed
  steps per frame when needed; tests should use `FixedStepDriver` directly.

- Friendly-fire toggle: Must be supplied to systems via StepContext or explicit parameter —
  systems must not read `useUI.getState()`.

Rationale (summary):

- Determinism and Physics-first authority are core constitution rules; aligning scoring,
  respawn timing, and IDs with StepContext removes sources of flakiness and enables
  reproducible traces.

- Moving session-level toggles into StepContext decouples UI from simulation, improving
  testability and reducing hidden dependencies.

Open research gaps & follow-ups (Phase 1 inputs):

- Proximity-avoidance algorithm for spawn placement (spatial index vs heuristic).

- Audit log export formats (JSON lines, compact binary) for future lockstep/networking needs.

- Pooling strategy and performance test harness for 500-entity performance target.

References:

- Feature spec: specs/001-title-simulation-spec/spec.md
- Constitution: .specify/memory/constitution.md

## Tech Context

This feature targets the repository's existing frontend tech stack: 

## Technologies

- React + TypeScript
- Vite
- @react-three/fiber (Three.js)
- @react-three/rapier (physics)
- miniplex (ECS)
- zustand (UI state)
- Vitest (unit tests)
- Playwright (E2E)

## Dependencies Notes

`docs/DEPENDENCIES-deep-dive.md` has descriptions for mentioned techs.


Next: Produce data model and contracts for Scoring and Respawn (Phase 1).

<!-- eof -->