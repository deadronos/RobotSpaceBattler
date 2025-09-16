# Project Brief — RobotSpaceBattler

**Status:** Starter brief (auto-generated)

## Purpose

RobotSpaceBattler is an experimental browser-based 3D arena where procedurally-generated robots fight under physics simulation. This project demonstrates a small game loop built with React + TypeScript + react-three-fiber and Rapier physics, and is intended as a learning and prototyping playground.

## Goals

- Provide a clean, modular simulation driven by an ECS (miniplex) and Rapier physics.
- Keep components small and testable so features can be experimented with quickly.
- Provide a clear path to replace procedural assets with glTF models.

## Scope

- Core simulation and renderer (Three.js + react-three-fiber)
- Procedural robot generation and basic AI
- Projectiles, weapons, and health/score systems
- Developer tooling: Vitest unit tests and Playwright smoke tests

## Non-goals

- No multiplayer networking in the initial scope
- Not intended to be production-grade; focus is on prototyping and experiments

## How to contribute

- Follow repo coding standards in `AGENTS.md` / `README.md`.
- Run tests (`npm run test`) and lint (`npm run lint`) before opening PRs.
