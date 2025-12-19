# Design — RobotSpaceBattler (as implemented snapshot)

**Updated:** 2025-12-19

This document is a high-level, code-aligned snapshot of the current runtime
architecture. It intentionally describes what exists in `src/` today.

## High-level architecture

- Rendering host: React + `@react-three/fiber` in `src/components/Scene.tsx`.
- Physics provider: `@react-three/rapier` `<Physics>` is mounted for collision
  queries and obstacle integration (gravity is zero).
- Simulation host: `src/components/Simulation.tsx` steps the simulation from
  `useFrame()`.
- Simulation controller: `src/runtime/simulation/battleRunner.ts` (`BattleRunner`)
  orchestrates the per-frame update order and match lifecycle.
- ECS state: `src/ecs/world.ts` (`BattleWorld`) uses Miniplex worlds + pools.
- ECS systems: `src/ecs/systems/*` (AI, combat, movement, projectiles, effects).
- Match lifecycle: `src/runtime/state/matchStateMachine.ts` controls start/victory
  delay/restart.
- Obstacles/hazards: `src/simulation/obstacles/*` maintains arena geometry and
  applies hazard effects.
- Telemetry: `src/runtime/simulation/ports.ts` defines a `TelemetryPort` used by
  systems to record fires/damage/deaths and obstacle events.

Mermaid overview:

```mermaid
flowchart TD
  UI[React UI] --> R3F[Canvas / r3f]
  R3F --> Scene[Scene]
  Scene --> Physics[Rapier Physics Provider]
  Scene --> Sim[Simulation]
  Sim --> Runner[BattleRunner.step]
  Runner --> ECS[BattleWorld (ECS)]
  Runner --> Systems[ECS Systems]
  Systems --> ECS
  ECS --> Visuals[Entity Visuals + Instancing]
  Visuals --> R3F
```

## Main runtime flow

`Simulation.tsx` owns a `BattleRunner` instance and steps it each render frame:

1. `useFrame(delta)`
   - Records renderer stats.
   - Calls `runner.step(delta)`.
2. `BattleRunner.step(deltaSeconds)`
   - Advances `world.state.elapsedMs`.
   - Updates obstacle movement and hazards.
   - If match is running:
     - `updateAISystem` (targeting, behavior selection, movement plan)
     - `updateCombatSystem` (cooldowns, fire events, projectile spawn)
     - `updateMovementSystem` (robot kinematics)
     - `updateProjectileSystem` (projectile movement, hits, damage, effects)
     - `updateEffectSystem` (effect lifetimes)
     - Victory evaluation
   - Ticks the match state machine and respawns a new match when needed.

## Data model overview

`BattleWorld` contains separate Miniplex worlds for entity categories, plus a
small amount of global state:

- Robots: `RobotEntity` (position, velocity, AI state, weapon, health, kills).
- Projectiles: `ProjectileEntity` (weapon, shooterId, team, damage, AoE, visuals).
- Obstacles: `ObstacleEntity` (shape, movement pattern, hazard schedule/effects).
- Effects: `EffectEntity` (visual effect type, radius, duration).

## Rendering and instancing

- Robots render via `RobotPlaceholder`.
- Projectiles/effects can render via per-entity components or via instanced
  renderers (`InstancedProjectiles`, `InstancedEffects`) depending on
  `useQualitySettings().visuals.instancing.enabled`.
- Laser visuals are batched by `LaserBatchRenderer` (derived from laser projectiles).

## Determinism notes

- Match spawning is seed-driven via `createBattleRunner` and the match spawner.
- Some configuration uses `Math.random()` at module initialization (stable within
  a single run but variable across reloads). Treat determinism as best-effort.

## Primary files to inspect

- `src/components/Simulation.tsx` and `src/components/Scene.tsx`
- `src/runtime/simulation/battleRunner.ts`
- `src/ecs/world.ts`
- `src/ecs/systems/aiSystem.ts`, `combatSystem.ts`, `movementSystem.ts`,
  `projectileSystem.ts`, `effectSystem.ts`
- `src/simulation/obstacles/*` and `src/simulation/match/matchSpawner.ts`
