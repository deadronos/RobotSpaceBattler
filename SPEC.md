# Spec & Concept — Space Station Auto-Battler (10v10 prototype)

This file focuses on the weapons & combat model and how it maps to the project's ECS, systems, tests, and deterministic simulation goals. It expands the existing high-level spec with concrete data shapes, system responsibilities, user stories, and implementation milestones for guns, lasers, and rockets.

## High-level goals

- Offer three distinct weapon families with predictable, testable behavior: guns (hitscan), lasers (beam/hitscan), rockets (projectiles/AoE).
- Use a unified Weapon ECS so systems share logic (cooldowns, ammo, ownership) while letting specialized systems resolve fire modes.
- Maintain determinism for unit tests and replays via a seeded RNG and fixed iteration ordering.
- Keep physics authoritative for projectile motion and collisions (Rapier RigidBody).

## Weapon families (behavior summary)

- Guns (hitscan): short-to-medium range, instantaneous or near-instant damage application, affected by spread and accuracy, uses ammo and reloads. Suitable for close-quarters and rapid exchanges.
- Lasers (beam/continuous): long-range, accurate or chargeable beams that apply damage over time (ticks) while channeling. Consume energy or have a charge mechanic. Visuals: continuous beam or rapid pulses.
- Rockets (projectiles): spawn physical projectile entities with velocity. Travel time and AoE on impact. May support homing. Require careful collision handling (ray-sweep) to avoid tunnelling.

## Determinism & testability

- All randomness (spread, critical hits, aim jitter, homing noise) must use `src/utils/seededRng.ts`.
- Systems that produce events must do so in a deterministic order (weaponSystem -> specialisedSystem -> damageSystem), and any per-frame iteration order should be stable.
- Provide a "deterministic mode" toggle in `Simulation` for CI tests: fixed timestep and fixed RNG seed.

## ECS: components and data shapes

Suggested TypeScript interfaces (add as `src/ecs/weapons.ts`):

```ts
// ...example only - add to src/ecs/weapons.ts
export type WeaponType = 'gun' | 'laser' | 'rocket'

export interface WeaponComponent {
  id: string
  type: WeaponType
  ownerId: number
  team: 'red' | 'blue'
  range: number
  cooldown: number // seconds
  lastFiredAt?: number
  power: number // base damage
  accuracy?: number // 0..1
  spread?: number // radians
  ammo?: { clip: number; clipSize: number; reserve: number }
  energyCost?: number
  projectilePrefab?: string
  aoeRadius?: number
  beamParams?: { duration?: number; width?: number; tickInterval?: number }
  flags?: { continuous?: boolean; chargeable?: boolean; burst?: boolean; homing?: boolean }
}

export interface WeaponStateComponent {
  firing?: boolean
  reloading?: boolean
  chargeStart?: number
  cooldownRemaining?: number
}

export interface ProjectileComponent {
  sourceWeaponId: string
  damage: number
  team: 'red'|'blue'
  aoeRadius?: number
  lifespan: number
  spawnTime: number
  speed?: number
  homing?: { turnSpeed: number; targetId?: number }
}

export interface BeamComponent {
  sourceWeaponId: string
  origin: [number, number, number]
  direction: [number, number, number]
  length: number
  width: number
  activeUntil: number
  tickDamage: number
  tickInterval: number
  lastTickAt: number
}

export interface DamageEvent {
  sourceId: number
  weaponId?: string
  targetId?: number
  position?: [number, number, number]
  damage: number
}
```

Design note: components are intentionally small and composable; `WeaponComponent` is declarative while `WeaponStateComponent` is ephemeral runtime state.

## Systems (responsibilities and contract)

- weaponSystem (coordinator)
  - Inputs: WeaponComponent, WeaponStateComponent, owner Transform, Target component, RNG
  - Responsibilities: manage cooldowns, ammo, charge, and when conditions are met route to the correct specialised system (hitscan, beam, projectile).
  - Outputs: WeaponFired events with context (muzzle position, direction, weapon id)

- hitscanSystem
  - Inputs: WeaponFired events for 'gun' and instant 'laser' weapons
  - Responsibilities: perform raycasts (using Rapier or scene raycast) with spread/accuracy applied via seeded RNG; resolve first hit, emit DamageEvent and Impact event for FX.
  - Determinism: raycast order and RNG seed must be consistent.

- beamSystem
  - Inputs: start/stop fire commands for beam/continuous weapons
  - Responsibilities: create BeamComponent entities, perform tick raycasts at beam tick intervals, apply tick damage via DamageEvent. Handle energy drain/interrupts.

- projectileSystem
  - Inputs: WeaponFired events for 'rocket' and similar
  - Responsibilities: spawn projectile entity with RigidBodyRef, apply initial velocity, monitor collisions via Rapier events or ray-sweeps, apply direct hit or AoE on impact, remove or recycle projectile.
  - Notes: for high-speed projectiles, perform a raycast from prevPos to nextPos each tick to avoid tunnelling.

- damageSystem / healthSystem
  - Inputs: DamageEvent
  - Responsibilities: apply damage to Health component, handle death, trigger knockback or death events.

- fxSystem (non-authoritative)
  - Inputs: Impact, Explosion, WeaponFired events
  - Responsibilities: spawn muzzle flash, impact decals, explosion particles, trails.

## Event ordering and determinism

- Establish a fixed pipeline order each frame:
  1. AI decisions (select target / movement intent)
  2. Movement system (apply velocities)
  3. weaponSystem (decide who fires)
  4. specialised weapon resolvers (hitscan/beam/projectile) — spawn events/entities
  5. physics step (rapier)
  6. projectileSystem collision checks & damage application
  7. damageSystem application and cleanup
  8. fxSystem spawn actions

- In deterministic mode, use a single seeded RNG instance per frame and consume values in the same order. Avoid implicit Math.random.


## User stories & combat flows (detailed)

Below are concrete user stories describing how fights should feel and how to test them.

1. Distinct weapon feel

- As an observer I want to instantly recognize weapon type by visuals and timing.
- Acceptance: guns show tracers/instant hits, lasers show beams or pulses with ticked damage, rockets show travel and AoE explosion.

1. Engagement ranges and AI behavior

- As an observer I want robots to prefer engagement distances that suit their weapon archetype.
- Behavior:
  - Gun bots try to close until within optimal range and then strafe while firing.
  - Laser bots favor distance, use cover and channel beams for sustained damage.
  - Rocket bots keep mid-range and use arcs/AoE to control choke points.
- Acceptance: in simulated matches robots with different weapon archetypes show distinct positioning and movement patterns; unit tests assert movement intents change when entering preferred range.

1. AoE and friendly-fire policy

- As a game designer I want AoE (rockets) to affect multiple entities; friendly-fire is toggled by game mode.
- Acceptance: in tests rocket explosion damages all entities inside radius; when friendly-fire off, allies are skipped.

1. Charge & interruption (lasers)

- As a designer I want lasers to optionally charge before releasing and be interrupted by movement/disable.
- Acceptance: charging sets a visible state and if target dies or owner is stunned the charge cancels and no beam spawns.

1. Deterministic unit tests

- As a developer I want to reproduce combat sequences for regression testing.
- Acceptance: tests that seed RNG and run a fixed-step simulation produce identical sequences (weapon fired frames, projectile hits, deaths).

## Example combat vignette (combination of systems)

- Setup: Blue Laser-Scout (long-range, channeling laser) + Red Rocket-Launcher (AoE) + Red Gunner.
- Flow (frame-level):
  1. AI: Laser-Scout picks Red Rocket as target at long distance.
  2. Laser-Scout begins charge (weaponSystem records chargeStart).
  3. Red Rocket detects Laser-Scout and launches rocket (projectileSystem spawns RigidBody with velocity).
  4. During rocket flight, Laser-Scout finishes charge and begins beam ticks (beamSystem spawns BeamComponent). Beam tick reduces rocket hp if rockets are destructible; otherwise damages launcher on impact.
  5. Rocket reaches proximity and explodes (projectileSystem handles AoE); damageSystem applies AoE damage and possibly kills Laser-Scout.

This shows interplay: channel vs missile tradeoffs, AoE, and projectile travel time.

## Edge cases & mitigations

- Projectile tunnelling: run a ray-sweep each physics frame between prevPos and newPos for each projectile. If collision found, handle impact immediately.
- Missing RigidBodyRef: if expected physics object missing, fallback to kinematic projectile with manual position updates (less accurate but safe).
- Event flooding: pool short-lived event objects and projectile entities to reduce allocation pressure.

## Mapping to repo (concrete file & test suggestions)

- Add `src/ecs/weapons.ts` (interfaces shown above).
- Ensure `src/utils/seededRng.ts` exposes a reproducible RNG factory (e.g., create(seed): Rng) and prefer passing Rng instances into systems.
- Update `src/components/Simulation.tsx` to support deterministic mode (fixed seed & timestep) and pass the `rng` to systems.
- Systems to adjust or confirm behavior:
  - `src/systems/WeaponSystem.ts` (coordinator) — ensure it delegates and emits WeaponFired events instead of performing raycasts itself.
  - `src/systems/HitscanSystem.ts` — ensure it consumes WeaponFired and uses the passed RNG for spread
  - `src/systems/ProjectileSystem.ts` — add ray-sweep check and AoE handling (overlap query on explosion)
  - `src/systems/BeamSystem.ts` — implement beam tick intervals and energy drain/interrupts

## Tests to add (Vitest + Playwright)

- Unit:
  - `tests/weapon-cooldown.test.ts` — cooldown and ammo/reload semantics
  - `tests/hitscan-determinism.test.ts` — deterministic raycast outcomes with seeded RNG
  - `tests/projectile-aoe.test.ts` — rocket explosion damages all valid targets in radius; friendly-fire toggle
  - `tests/beam-tick.test.ts` — beam channeling applies tickDamage at intervals, stops when energy empty or interrupted

- E2E / Playwright:
  - Deterministic smoke: run a short seeded 10v10 match and assert that the simulation progresses (elements exist, #status updated) and optionally capture event logs for manual diffing.

## Implementation milestones (prioritized)

1. Weapon ECS & Coordinator (low-risk)
   - Create `src/ecs/weapons.ts`, wire `WeaponSystem` to emit WeaponFired events.
   - Tests: cooldown & ammo.
2. Hitscan & Laser (mid)
   - Implement `hitscanSystem` and `beamSystem` with seeded RNG usage and beam tick throttling.
   - Tests: deterministic hits and beam ticks.
3. Projectiles & Rockets (mid-hard)
   - Projectile lifecycle, ray-sweep anti-tunnel, AoE explosion.
   - Tests: projectile-aoe & collision robustness.
4. AI weapon-aware movement & scenarios (polish)
   - AI chooses engagement distance per weapon archetype and basic group tactics.
   - Playwright deterministic smoke runs.

## Acceptance criteria for the prototype

- Visual differentiation: each weapon family has distinct visuals and timing.
- Deterministic tests: seeded runs produce the same event sequences.
- No missed collisions for high-speed projectiles in unit tests (ray-sweep active).
- AI uses weapon archetype to influence spacing and tactics.

## Next-steps (how I can help)

- I can add `src/ecs/weapons.ts` and a starter unit test (fast). Call out which file you'd like me to edit first and I'll implement + run tests.
- I can open PR-style patches for `WeaponSystem` -> `HitscanSystem` wiring if you'd prefer full example code.

---

This updated spec focuses on creating testable, deterministic weapon behavior with clear responsibilities and a path to implement guns, lasers, and rockets in the existing architecture. If you want, I can start by adding the `src/ecs/weapons.ts` file and a small deterministic unit test now.
