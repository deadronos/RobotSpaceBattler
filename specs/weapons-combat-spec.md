# Weapons & Combat Spec — RobotSpaceBattler

This document extracts and expands the weapons and combat sections from the main `SPEC.md` into a standalone, actionable spec. It describes the three weapon families (guns, lasers, rockets), a unified Weapon ECS, system responsibilities, deterministic testing guidance, user stories, edge cases, and an implementation plan mapped to the repository.

## High-level goals

- Support three distinct weapon families: guns (hitscan), lasers (beam/continuous), rockets (projectiles/AoE).
- Use a unified Weapon ECS that separates declarative weapon data from ephemeral weapon state.
- Make behavior deterministic and testable via a seeded RNG and stable system ordering.
- Keep physics authoritative for projectile motion and collisions (Rapier RigidBody).

## Weapon families (summary)

- Guns (hitscan): short-to-medium range, near-instant damage using raycasts. Affected by spread/accuracy, uses ammo and reloads.
- Lasers (beam/continuous): long-range, accurate or chargeable beams with damage-over-time ticks while channeling. Consumes energy or requires charge.
- Rockets (projectiles): physical projectiles with travel time and AoE explosion on impact. May support homing; require ray-sweep checks to avoid tunnelling.

## Determinism & testability

- All randomness (spread, aim jitter, homing noise) must use `src/utils/seededRng.ts`.
- Systems must consume RNG in a stable order. Provide a "deterministic mode" in `Simulation` that sets a fixed seed and fixed timestep.

## ECS: components and data shapes

Add a new file `src/ecs/weapons.ts` with the following interfaces as guidance for implementation:

```ts
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
  firedAt?: number // timestamp (ms) when the beam was created/fired
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

Notes:

- `WeaponComponent` is declarative and persists on an entity. `WeaponStateComponent` holds runtime flags and transient state.
- Projectile and Beam entities are spawned by systems and carry the minimal data needed for resolution.

## Systems & responsibilities

- weaponSystem (coordinator)
  - Manages cooldowns, ammo, reloading, charge mechanics.
  - Decides when to fire and emits WeaponFired events (rather than directly resolving hits).

- hitscanSystem
  - Handles guns and instant lasers.
  - Performs raycasts (Rapier or renderer raycast) with spread/accuracy applied using the seeded RNG.
  - Produces DamageEvent and Impact events for FX.

- beamSystem
  - Creates BeamComponent entities for continuous or pulsed lasers.
  - Performs tick raycasts along the beam at `tickInterval` to apply tick damage.
  - Drains energy and supports interruption.

- projectileSystem
  - Spawns projectile entities with `RigidBodyRef` and `ProjectileComponent`.
  - Each tick: advance projectile; perform ray-sweep from previous to new position to avoid tunnelling; on impact, apply direct hit or AoE damage and remove/recycle projectile.

- damageSystem / healthSystem
  - Consumes DamageEvent, updates Health component, triggers death logic, and produces Death events.

- fxSystem
  - Non-authoritative: spawns muzzle flashes, trails, explosions based on events.

## Per-frame event ordering (deterministic pipeline)

Use a fixed pipeline each frame to keep deterministic behavior:

1. AI decisions (target selection, movement intent)
2. Movement system (apply velocities/forces)
3. weaponSystem (decide and emit WeaponFired events)
4. specialised weapon resolvers (hitscan/beam/projectile) — spawn projectiles/events
5. physics step (Rapier)
6. projectileSystem collision checks & damage application
7. damageSystem application and cleanup
8. fxSystem spawn actions

Important: use a single RNG per frame (created from seed + frameIndex) and pass it to systems that need randomness.

## User stories & combat flows

1. Distinct weapon feel

- As an observer I want to instantly recognize weapon type by visuals and timing.
- Acceptance: guns show tracers/instant hits, lasers show beams or pulses with ticked damage, rockets show travel and AoE explosion.

1. Engagement ranges and AI behavior

- As an observer I want robots to prefer engagement distances that suit their weapon archetype.
- Behavior:
  - Gun bots approach to optimal range and strafe while firing.
  - Laser bots hold distance and use cover, channel beams for sustained damage.
  - Rocket bots keep mid-range and use arcs/AoE to control choke points.
- Acceptance: tests show movement intents change when entering preferred range and visually robots arrange differently per archetype.

1. AoE and friendly-fire policy

- As a game designer I want AoE (rockets) to affect multiple entities and friendly-fire to be toggled by game mode.
- Acceptance: rocket explosion in tests damages entities within radius; when friendly-fire disabled allies are skipped.

1. Charge & interruption (lasers)

- As a designer I want lasers to optionally charge before firing and be interruptible by movement or stun.
- Acceptance: charging shows visible state; cancelled charges do not spawn beams or apply damage.

1. Deterministic unit tests

- As a developer I want to reproduce combat sequences for regression testing.
- Acceptance: seeded runs with fixed timestep produce identical event sequences (weapon fire frames, projectile hits, deaths).

## Example vignette

- Blue Laser-Scout charges and channels at range while Red Rocket-Launcher fires a rocket; beam can destroy rocket mid-flight; rocket explodes near the scout and deals AoE damage.

This demonstrates interplay between channeling (beam), projectile travel time, and AoE damage.

## Edge cases & mitigations

- Projectile tunnelling: run ray-sweep each physics update for projectile travel distance and resolve collision if ray intersects before RigidBody collision.
- Missing physics refs: fallback to kinematic projectile updates if `RigidBodyRef` absent.
- Event flooding: pool event objects and projectile entities.

## Mapping to repository (concrete files)

- Add: `src/ecs/weapons.ts` — interfaces and small helper types.
- Ensure: `src/utils/seededRng.ts` exposes a RNG factory (create(seed): Rng) and that systems accept RNG instances.
- Update: `src/components/Simulation.tsx` to support deterministic mode (seed & fixed timestep) and pass RNG into systems.
- Systems to implement/verify:
  - `src/systems/WeaponSystem.ts` — emits WeaponFired events
  - `src/systems/HitscanSystem.ts` — consumes WeaponFired and resolves hits with RNG
  - `src/systems/ProjectileSystem.ts` — spawns projectiles and does ray-sweep checks
  - `src/systems/BeamSystem.ts` — beam lifecycle and tick damage

## Tests to add (Vitest)

- `tests/weapon-cooldown.test.ts` — cooldown & ammo decrement/reload semantics
- `tests/hitscan-determinism.test.ts` — deterministic hits for seeded RNG and fixed scenario
- `tests/projectile-aoe.test.ts` — AoE correctness and friendly-fire toggle
- `tests/beam-tick.test.ts` — beam tick intervals and interruption behavior

## Playwright / E2E

- Deterministic smoke: run a short seeded 10v10 simulation and assert that simulation starts and expected events occur. Optionally, capture logs for manual diffing.

## Implementation milestones

1. Weapon ECS & Coordinator (low-risk)
   - Create `src/ecs/weapons.ts`, update `WeaponSystem` to emit weapon events.
   - Unit tests for cooldown and ammo.
2. Hitscan & Laser (mid)
   - Implement hitscan and beam tick systems using seeded RNG.
   - Deterministic unit tests for hits and beam ticks.
3. Projectiles & Rockets (mid-hard)
   - Implement projectile lifecycle, ray-sweep anti-tunnelling, AoE.
   - Tests for projectile collisions and AoE.
4. AI tuning & scenarios
   - Per-weapon engagement behaviors and group tactics. Playwright deterministic smoke tests.

## Acceptance criteria

- Visual differentiation of weapon families.
- Deterministic unit tests pass for seeded scenarios.
- No missed collisions for high-speed projectiles in unit tests.
- AI uses weapon archetypes to influence spacing and tactics.

## Next steps I can take

- I can add `src/ecs/weapons.ts` and a starter test now.
- I can implement weaponSystem -> hitscanSystem wiring in an example patch.

---

*Created by the automated assistant to extract and expand the weapons/combat sections from `SPEC.md` into a separate, implementation-ready spec.*
