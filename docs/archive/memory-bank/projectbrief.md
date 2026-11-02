# Project Brief — RobotSpaceBattler

**Created:** 2025-10-17

Purpose

A compact robot battle simulation used as a research and demo playground to explore:

- Seeded simulation runs and reproducible tests (where inputs are controlled)
- Composable ECS systems (AI, weapons, damage, obstacles)
- Rapier-backed arena colliders and raycasting (line-of-sight and obstacle integration)

Core goals

- Seeded match spawning and deterministic ordering where practical (IDs, iteration order)
- Small, testable systems that can be unit tested outside of React/r3f
- Clear separation between simulation state (`BattleWorld`) and rendering (r3f components)
- Fast feedback loop for iterating gameplay features and visual FX

Primary audiences

- Engineers building deterministic game loops and simulation tooling
- Contributors learning deterministic ECS patterns with React + r3f
- Test authors who need reproducible integration tests and Playwright E2E

Primary artifacts

- `src/` — implementation (simulation, ECS, AI, visuals)
- `specs/` — feature-level specs and plans (kept “as implemented”)
- `tests/` & `playwright/` — unit and E2E test harnesses

Important links

- `AGENTS.md` — contributor and agent guidance
- `specs/` — feature-level specs and plans

Notes

Keep this brief. For feature-level decisions and implementation plans, prefer the numbered folders under `specs/`.
