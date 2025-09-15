# System Patterns — RobotSpaceBattler

## Architecture overview

- Renderer: `src/components/Scene.tsx` creates Three.js `Canvas` and wraps the simulation in `Physics`.
- Simulation: `src/components/Simulation.tsx` contains spawn logic and per-frame systems.
- ECS: `miniplex` is used as a lightweight component store (`src/ecs/miniplexStore.ts`).

## Patterns

- Physics-first transforms: Rapier RigidBody is the source of truth for positions; systems must sync state from physics to ECS when required.
- One-file systems: keep per-frame systems small and localized (see `src/components/Simulation.tsx`).
- Test-first for core systems: write unit tests for systems that don't require DOM/three rendering using Vitest.

## Common pitfalls

- Directly mutating mesh transforms while Rapier is active can cause desynchronization.
- Overly large Simulation files can become hard to test — split systems where useful.
