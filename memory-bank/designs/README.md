# Designs Overview

This folder contains focused design artifacts used by implementers and reviewers. Current files:

- `ai-design.md` — AI system state machine, queries, perception and decision modules
- `design.md` — High-level architecture, runtime flows and rationale
- `physics-sync-design.md` — Physics-authoritative sync pattern and pause/resume handling
- `weapons-design.md` — Weapon resolution, hitscan/beam/projectile patterns and event flows

Where to look next
- Implementation: `src/systems/`, `src/ecs/`, `src/components/Simulation.tsx`
- Tests: `tests/` and `playwright/`
- Specs: `specs/` for feature-level acceptance criteria
