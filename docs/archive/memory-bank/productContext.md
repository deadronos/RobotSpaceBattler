# Product Context

**Created:** 2025-10-17

Why this project exists

- Provide a compact, deterministic simulation playground for experimenting with game systems
  (AI, weapons, physics) and reproducible tests.

Problems it solves

- Demonstrates patterns for physics-authoritative ECS simulations in the browser
- Provides testable system boundaries so unit tests can exercise logic without Three/Rapier

How it should work

- `BattleRunner` advances simulation time using the render loop delta and a seeded RNG.
- Systems are pure where possible and accept explicit inputs (`BattleWorld`, `rng`,
  `deltaSeconds`, `elapsedMs`).
- Rapier is used for arena colliders, obstacle integration, and raycasting (not for per-robot physics authority).

User experience goals

- Fast local dev iter: `npm run dev` shows the arena and HUD
- Deterministic-enough test harnesses for core behaviors (spawn, captain election, weapons/damage)
- Clear developer ergonomics: small systems, well-typed entities, and good tests

Determinism notes

- The simulation uses a seeded RNG (`createXorShift32`) for match generation.
- Some runtime behaviors are intentionally non-deterministic across page reloads (team spawn
  jitter in `TEAM_CONFIGS` uses `Math.random()`).
- Many tests pass explicit seeds and controlled time steps to ensure reproducible outcomes.
