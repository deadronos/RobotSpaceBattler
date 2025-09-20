# System Patterns — RobotSpaceBattler

**Last updated:** 2025-09-20

## Architecture overview

- Renderer: `src/components/Scene.tsx` creates the Three.js `Canvas` and wraps `Simulation` with `Physics`.
- Simulation: `src/components/Simulation.tsx` hosts spawn logic and per-frame systems.
- ECS: `miniplex` is the lightweight component store (`src/ecs/miniplexStore.ts`).

## Patterns

- Physics-first transforms: Rapier `RigidBody` is the source of truth for positions; systems should sync from physics to ECS when necessary.
- One-file systems: keep per-frame systems small and testable rather than monolithic files.
- Test-first: write unit tests for systems that don't require DOM/three rendering; mock physics where appropriate.

## Common pitfalls

- Directly mutating mesh transforms while a `RigidBody` is present leads to desync between physics and rendering.
- Overly large Simulation files can become hard to test; split responsibilities and export small functions for unit testing.
