# Project Brief — RobotSpaceBattler

**Status:** Canonical memory (auto-updated)

**Last updated:** 2025-09-20

## Purpose

RobotSpaceBattler is a compact, educational browser-based 3D arena for experimenting with physics-driven gameplay, procedural content, and modular systems engineering. The repository is structured to be easy to fork, test, and extend by contributors learning modern React + Three.js + Rapier workflows.

## High-level goals

- Maintain a physics-first, testable simulation architecture using Rapier and a lightweight ECS (miniplex).
- Provide clear separation between simulation authority (physics) and rendering/FX layers.
- Offer a repeatable developer experience (Vite, Vitest, Playwright) for CI and local development.

## Scope

- Core simulation and renderer (react-three-fiber + Three.js)
- Procedural robot prefabs, AI behaviors, and weapon systems (hitscan, projectile, beam)
- Physics integration via `@react-three/rapier` with Rapier `RigidBody` authoritative
- Test infrastructure (Vitest unit tests, Playwright smoke E2E)

## Out of scope (explicit)

- Multiplayer/networking (not planned in current scope)

## Contribution guidance

- Follow code style and contributor guidance (`AGENTS.md`, `CONTRIBUTING.md`).
- Run lint, format, and tests before submitting changes (`npm run lint && npm run format && npm run test`).
- Keep changes small and well-tested; update `memory-bank` files when making cross-cutting architectural changes.

## Acceptance criteria for core features

- Simulation systems are test-covered (Vitest) and deterministic when using seeded RNG helpers.
- Rapier remains authoritative for physical transforms; systems read positions from RigidBody when present.
- Playwright smoke verifies basic UI and canvas rendering in CI.
