# Design — RobotSpaceBattler (current implementation snapshot)

**Generated:** 2025-10-03

This design document captures the current architecture, component interfaces, data flows, and key implementation details of the repository as implemented today. It is intended as a living snapshot to help new contributors and to be referenced in the memory bank.

## High-level architecture

- Frontend renderer: React + @react-three/fiber (Three.js) in `src/components/Scene.tsx`.
- Physics: Rapier via `@react-three/rapier` provider in `Scene.tsx` (updateLoop="independent", fixed timeStep 1/60).
- Simulation host: `src/components/Simulation.tsx` — runs deterministic fixed-step loop and calls systems.
- ECS: `miniplex` world wrapped by `src/ecs/miniplexStore.ts` and `src/ecs/worldFactory.ts`.
- Systems: Pure, testable systems under `src/systems/` (AI, Weapon, Hitscan, Beam, Projectile, Damage, Scoring, Respawn, PhysicsSync, FX).
- UI state: `zustand` store at `src/store/uiStore.ts` for pause, friendly-fire, showFx, etc.

Mermaid architecture overview:

```mermaid
flowchart TD
  A[Browser UI (React)] -->|renders| B[Canvas (@react-three/fiber)]
  B --> C[Scene]
  C --> D[Physics (@react-three/rapier)]
  C --> E[Simulation]
  E --> F[FixedStepDriver]
  F --> G[Systems (AI, Weapon, Hitscan, Projectile, Beam, Damage, Scoring, Respawn, FX, PhysicsSync)]
  G --> H[miniplex World (ECS)]
  H --> B
  style D fill:#f9f,stroke:#333,stroke-width:1px;
  style E fill:#ff9,stroke:#333,stroke-width:1px;
  style H fill:#9ff,stroke:#333,stroke-width:1px;
```

## Data model (components & shapes)

Key component interfaces (current implementation):

- Transform
- Health
- Weapon (see `src/ecs/weapons.ts`)
- WeaponState
- Projectile
- Beam
- RobotStats

Representative TypeScript interfaces (from current code):

- Transform: { position: [number,number,number]; rotation: [number,number,number] }
- Health: { hp: number; maxHp: number; alive: boolean }
- WeaponComponent: (id, type, ownerId, team, range, cooldown, power, flags, ammo, aoeRadius, beamParams)
- ProjectileComponent & BeamComponent: payloads emitted by weapon processing systems

Note: The canonical `Entity` type is defined in `src/ecs/miniplexStore.ts` as a Partial composite including the above components plus runtime refs (`rigid`, `mesh`) and utility fields (`pauseVel`, `id`, `team`).

## Main runtime flows

1. Bootstrap
   - `main.tsx` runs `resetAndSpawnDefaultTeams()` before React mounts when world is empty. This ensures early queries render entities immediately.
   - `useSimulationBootstrap` initializes queries, resets scores/respawn queue, and spawns teams.

2. Fixed-step simulation loop
   - `useFixedStepLoop` (hook) constructs a `FixedStepDriver` (seeded RNG + fixed timestep) and uses `useFrame` to step it when enabled.
   - Each step provides a StepContext: { frameCount, simNowMs, rng, step }.
   - Per-step systems invoked (order matters): AI → WeaponSystem → Hitscan/Beam/Projectile → DamageSystem → Scoring/Respawn → PhysicsSync → FX

3. Weapon resolution
   - WeaponSystem manages cooldowns and emits WeaponFiredEvent objects.
   - HitscanSystem uses the rapier raycast when available (falls back to heuristic) to resolve direct hits and emits Damage and Impact events.
   - ProjectileSystem spawns projectile entities for rocket-type weapons; projectiles may use rapier rigid bodies when appropriate, have lifespan & AoE logic, homing, and collision checks within the ECS world.
   - BeamSystem coordinates damage-over-time ticks and emits Damage events on ticks.

4. Damage & death
   - DamageSystem consumes DamageEvent objects, updates Health components, marks alive=false on death, emits Death events, and ensures rigid bodies are stabilized on death.
   - ScoringSystem & RespawnSystem process death events to update score and respawn robots respectively.

5. Physics sync & rendering
   - Physics is authoritative: rapier rigid-body references are attached to entities by prefabs (e.g., `Robot` prefab attaches `entity.rigid`).
   - `physicsSyncSystem` reads rigid translation APIs and copies into `entity.position`, notifying render subscriptions via `entityLookup.notify`.
   - Rendering uses on-demand frameloop driven by `TickDriver` and `invalidate()` calls triggered by entity changes or timed frames.

## Important implementation conventions & rationale

- Physics-first: Do not mutate mesh transforms directly if a `RigidBody` is present — instead use `RigidBody` APIs and sync from physics to ECS via `physicsSyncSystem`.
- Determinism: `FixedStepDriver` with seeded RNG is used to make simulation behavior reproducible in unit tests.
- Small, testable systems: Systems export pure logic where feasible, enabling unit tests without Three.js or Rapier.
- Entity lifecycle & lookup: `entityLookup` provides numeric id generation, tracking, and a notification subscription API to let React components invalidate renders on entity changes.

## Interfaces and extension points

- Hooks
  - `useFixedStepLoop({enabled, seed, step}, onStep)` — hosts the deterministic stepping behavior.
  - `useSimulationBootstrap(robotQuery, projectileQuery, beamQuery, invalidate)` — bootstrap & cleanup for queries and spawn logic.

- World / ECS
  - `miniplexStore.world` — the miniplex World instance.
  - `createRobotEntity(init)` — factory for robot entities.
  - `getRenderKey(entity, fallback)` — stable render keys for React mapping.

- Systems
  - All systems accept `world` and contextual params (rng, rapierWorld, step, events) and may emit events by pushing to provided arrays.

- UI
  - `useUI` (zustand) for toggles: paused, friendlyFire, showFx, etc.

## Testing & validation

- Determinism tests rely on `FixedStepDriver` and seeded RNG utilities in `src/utils/seededRng.ts`.
- System unit tests live under `tests/` and target system logic (AI, weapon flows, projectile behavior, friendly-fire, FX ordering, pause behavior).
- Playwright smoke test verifies the app boots, renders canvas and status elements; Playwright config starts a webServer on port 5174 for CI.

## Operational notes and risks

- Friendly-fire/sourceId propagation: Known area that needs regression tests — `activeContext.md` and `progress.md` call this out.
- Rapier API: The code defensively wraps Rapier calls in try/catch to handle differences between runtime and test harnesses, but heavy Rapier refactors require careful updates to `physicsSyncSystem` and `rapierHelpers`.

## Files to inspect for further design changes

- `src/components/Simulation.tsx` — Simulation loop and system orchestration.
- `src/components/Scene.tsx` — Canvas, Physics provider and TickDriver.
- `src/ecs/miniplexStore.ts` — Entity typing and world wiring.
- `src/systems/*` — Individual systems and their published events.
- `src/hooks/useFixedStepLoop.ts`, `src/utils/fixedStepDriver.ts`, `src/utils/seededRng.ts` — determinism primitives.



