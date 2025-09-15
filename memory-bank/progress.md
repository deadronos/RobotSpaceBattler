# Progress - RobotSpaceBattler

## What works

- Core simulation loop and renderer (Three.js + react-three-fiber)
- Procedural robot generation and basic AI
- Weapons ECS (in progress)
- Projectile and beam entities render with Rapier bodies tied to ECS state
- Weapon events carry target ids for hitscan/beam/projectile systems
- Seeded RNG utility for deterministic tests
- Physics sync and projectile cleanup systems
- Unit tests for core systems (Vitest)
- Playwright E2E smoke test

## What's left to build

- Integrate unified weapons ECS into Simulation
- Expand unit tests for weapon cooldowns and projectile lifecycle
- Audit and add missing tasks to memory bank
- Document port usage and CI setup in techContext.md

## Current status

- Weapons ECS: In progress (see TASK006)
- Playwright/dev server port mismatch: Pending (see TASK004)
- Task list expansion: Pending (see TASK005)

## Known issues

- Playwright smoke test expects dev server on port 5174, Vite default is 5173
- Some systems lack full unit test coverage
- No multiplayer/networking support (out of scope)

