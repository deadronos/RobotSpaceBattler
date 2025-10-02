# Project Brief — RobotSpaceBattler

**Status:** Canonical memory (auto-updated)

**Last updated:** 2025-10-03

## Purpose

RobotSpaceBattler is a compact, educational browser-based 3D arena for experimenting with physics-driven gameplay, procedural content, and modular systems engineering. The repository emphasizes a physics-first simulation model and testability while using modern React + Three.js + Rapier tooling.

## High-level goals

- Maintain a physics-first, testable simulation architecture where Rapier bodies are authoritative for transforms and rendering is driven from the simulation state.
- Use a deterministic fixed-step simulation loop for game logic (see `useFixedStepLoop`) and an on-demand render model so frames are only produced when needed.
- Keep systems small, well-tested, and composable so contributors can iteratively extend AI, weapons, and FX.
- Provide reproducible developer workflows (Vite, Vitest, Playwright) so simulation behavior is verifiable in CI and locally.

## Scope

- Core simulation and renderer (react-three-fiber + Three.js)
- Procedural robot prefabs, AI behaviors, and weapon systems (hitscan, projectile, beam)
- Physics integration via `@react-three/rapier` with Rapier `RigidBody` authoritative; Physics is driven with `updateLoop="independent"` and a fixed `timeStep` for consistency
- Deterministic step driver (`useFixedStepLoop`) that supplies a seeded RNG and fixed timestep to systems
- Test infrastructure (Vitest unit tests, Playwright smoke E2E)

## Out of scope (explicit)

- Multiplayer/networking (not planned in current scope)

## Contribution guidance

- Follow code style and contributor guidance (`AGENTS.md`, `CONTRIBUTING.md`).
- Run lint, format, and tests before submitting changes (`npm run lint && npm run format && npm run test`).
- Small, tested changes are preferred; update `memory-bank` core files when altering architecture or integration points.

## Acceptance criteria for core features

- Simulation systems are test-covered (Vitest) and deterministic when using the fixed-step driver.
- Rapier remains authoritative for physical transforms; systems read positions from `RigidBody` when present and use `physicsSyncSystem` to reconcile state.
- Playwright smoke verifies basic UI and canvas rendering in CI (webServer is configured to start on port 5174 by Playwright config).
