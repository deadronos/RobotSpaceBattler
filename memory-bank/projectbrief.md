# Project Brief — RobotSpaceBattler

**Created:** 2025-10-17

Purpose

A compact, deterministic robot battle simulation used as a research and demo playground to explore:

- Deterministic simulation and reproducible tests
- Composable ECS systems (AI, weapons, damage, respawn)
- Physics-driven movement via Rapier

Core goals

- Deterministic fixed-step simulation for reproducible behavior and testability
- Small, pure systems that are easy to unit-test outside of Three/Rapier
- Clear separation between physics authority (Rapier) and ECS/rendering
- Fast feedback loop for iterating gameplay features and visual FX

Primary audiences

- Engineers building deterministic game loops and simulation tooling
- Contributors learning deterministic ECS patterns with React + r3f
- Test authors who need reproducible integration tests and Playwright E2E

Primary artifacts

- `src/` — implementation, systems, hooks, components
- `specs/` — feature-level specs and plans
- `tests/` & `playwright/` — unit and E2E test harnesses

Important links

- `AGENTS.md` — contributor and agent guidance
- `specs/` — feature-level specs and plans

Notes

Keep this brief. For feature-level decisions and implementation plans, prefer the numbered folders under `specs/`.
