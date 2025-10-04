# System Patterns — RobotSpaceBattler

**Last updated:** 2025-10-05

## Architecture overview

- Renderer: `src/components/Scene.tsx` creates the Three.js `Canvas` and wraps `Simulation` with `Physics`.
- Simulation: `src/components/Simulation.tsx` hosts spawn logic and per-step systems; it runs systems inside a deterministic fixed-step driver (`useFixedStepLoop`).
- ECS: `miniplex` is the lightweight component store (`src/ecs/miniplexStore.ts`). The project uses a small world controller and an `entityLookup` utility to track and notify render-time changes.

## Concrete patterns and utilities

- World & entity tracking:
  - `createWorldController` (wrapped by `miniplexStore`) builds the miniplex world and wires `onEntityAdded`/`onEntityRemoved` callbacks used by the `entityLookup` helper.
  - `subscribeEntityChanges` exposes a lightweight subscription hook used by
    `Simulation` to call `invalidate()` when entities change. This is the
    canonical place to trigger demand-frame invalidation so rendering stays in
    sync with game-state changes.
  - `getRenderKey(entity, fallbackIndex)` produces stable keys for React `key`
    props so adding/removing entities doesn't cause visual churn.

- Physics-first transforms:
  - Rapier `RigidBody` is the source of truth for physics-driven entities. Use
    `physicsSyncSystem` to copy authoritative Rapier transforms into ECS
    `position`/`rotation` components, and avoid direct mesh position mutation
    when a `RigidBody` exists.
  - Robot prefabs intentionally do not require a `rigid` component in their
    render query — the prefab mounts the `RigidBody` on mount. Requiring
    `rigid` in a render query prevents robots from rendering during initial
    setup.

- Deterministic fixed-step loop:
  - `useFixedStepLoop` drives game systems with a fixed timestep and supplies a
    seeded RNG per tick. The hook accepts `FixedStepLoopOptions` (partial shape
    shown):
    - `enabled: boolean` — driver enabled/disabled (respect `paused` UI flag)
    - `seed: number` — deterministic RNG seed
    - `step: number` — fixed timestep (seconds)
    - `testMode?: boolean` — when enabled the hook exposes test helpers and instrumentation
    - `friendlyFire?: boolean` — runtime flag that is propagated to the driver
      via `setFlags` so systems can honor team rules at runtime
  - Systems receive a `StepContext` from the driver with the properties
    `{ step, rng, simNowMs, frameCount, idFactory, ... }` so systems can be
    pure and deterministic for testing.

- Pause / resume handling:
  - Pause-related velocity capture/restore utilities exist
    (`capturePauseVel`, `restorePauseVel`) so when pausing the simulation we
    persist entity velocities and reapply them on resume.

## Recommended development patterns

- Small, focused systems: Export smaller functions from systems so they can be unit tested without Three.js or Rapier.
- Query design: When rendering prefabs (for example `Robot`), avoid requiring
  the `rigid` component in the render query; the prefab mounts the `rigid` on
  mount.
- Keep side-effects localized: Systems should emit events (damage, projectile
  spawn, fx) that are processed by dedicated systems rather than doing large
  imperative side-effects inline in the render layer.

## Common pitfalls

- Mutating mesh transforms while a `RigidBody` is present leads to desync between physics and rendering.
- Large Simulation files become hard to test; split responsibilities and export pure helpers for unit tests.
- Forgetting to `invalidate()` after entity changes can lead to stale visuals
  when using on-demand rendering; prefer `subscribeEntityChanges` and
  centralized invalidation.
