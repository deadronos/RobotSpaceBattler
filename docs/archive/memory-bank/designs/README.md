# Designs Overview

This folder contains focused, code-aligned design snapshots used by implementers
and reviewers.

Current files:

- `design.md` — High-level architecture and runtime update order
- `ai-design.md` — AI pipeline (seek/engage/retreat), sensors, targeting, movement planning
- `weapons-design.md` — Combat and projectile simulation, damage rules, telemetry
- `physics-sync-design.md` — Rapier integration for obstacles and spatial queries

Where to look next:

- Implementation: `src/components/Simulation.tsx`, `src/runtime/simulation/battleRunner.ts`,
  `src/ecs/world.ts`, `src/ecs/systems/*`
- Tests: `tests/` and `playwright/`
- Specs: `specs/` for feature-level acceptance criteria
