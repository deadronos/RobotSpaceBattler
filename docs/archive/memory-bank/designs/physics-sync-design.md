# Rapier Integration Design (as implemented)

**Updated:** 2025-12-19  
**Status:** Current Implementation

## Overview

The project mounts a Rapier physics world via `@react-three/rapier`, but the
simulation is not "physics authoritative" for robots or projectiles.

Current usage is focused on:

- maintaining obstacle geometry in the Rapier world for spatial queries
- enabling raycasts/avoidance queries against up-to-date obstacle transforms

Robots and projectiles are simulated as kinematic ECS entities.

## Physics configuration

`src/components/Scene.tsx` mounts:

```tsx
<Physics gravity={[0, 0, 0]} interpolate={false}>
  {children}
</Physics>
```

## How the Rapier world is wired in

`src/components/Simulation.tsx` uses `useRapier()` to access the current Rapier
world and passes it to the `BattleRunner`:

- `runner.setRapierWorld(rapierWorld)` on mount
- `runner.setRapierWorld(null)` on unmount

The type assertion in `Simulation.tsx` exists because `@react-three/rapier`
bundles a Rapier type that does not unify with the direct
`@dimforge/rapier3d-compat` type.

## Obstacle bindings

When a Rapier world is attached, `BattleRunner.setRapierWorld()` stores it on the
`BattleWorld` and calls `syncObstaclesToRapier(world)`.

Obstacle integration is implemented in a defensive adapter style:

- File: `src/simulation/obstacles/rapierIntegration.ts`
- Uses a `WeakMap<BattleWorld, Map<string, unknown>>` to avoid mutating entity
  types.
- Calls optional methods on the Rapier world if present:
  - `createObstacleCollider` or `createKinematicBody`
  - `updateObstacleTransform` or `setKinematicBodyTransform`
  - `removeObstacle`

This keeps unit tests resilient when Rapier is unavailable or replaced by a
lightweight stub.

## Keeping transforms in sync

Obstacle movement updates run every frame in `BattleRunner.step()`.

- Obstacle transforms are updated in the ECS world.
- At the end of obstacle movement, `updateRapierObstacleTransforms(world)` is
  called so Rapier queries see the current arena geometry.

## What is *not* using Rapier right now

- Robot movement: `updateMovementSystem` updates positions/velocities directly.
- Projectile hits: `updateProjectileSystem` uses ECS-space checks and does not
  rely on Rapier collision events.

If robots/projectiles are migrated to Rapier bodies in the future, this document
should be replaced with a physics-authoritative sync contract.

## Primary files to inspect

- `src/components/Scene.tsx`
- `src/components/Simulation.tsx`
- `src/runtime/simulation/battleRunner.ts`
- `src/simulation/obstacles/rapierIntegration.ts`
- `src/simulation/obstacles/movementSystem.ts`
