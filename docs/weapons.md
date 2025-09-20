# Weapons ECS Design

The unified weapons ECS models hitscan (guns), projectile (rockets), and beam (lasers) weapons with a shared set of components and frame-synchronous systems. Weapon logic is deterministic when driven through `Simulation` thanks to the seeded RNG and fixed timestep.

## Core Components

- `WeaponComponent` – canonical weapon definition attached to a robot. Contains the weapon `type`, owner/team metadata, `cooldown`, `power`, optional `ammo`, projectile and beam tuning, and behaviour flags (continuous fire, chargeable, homing, etc.).
- `WeaponStateComponent` – transient per-frame state: `firing`, `cooldownRemaining`, `reloading`, and optional `chargeStart` timestamp. Updated by `weaponSystem` each tick.
- `ProjectileComponent` – state stored on spawned projectile entities. Tracks owner/source weapon, team, damage, speed, lifespan, AOE radius, and optional homing data.
- `BeamComponent` – state stored on active beam entities. Tracks origin/direction, length/width, lifetime, tick cadence, and tick damage budgets.
- `DamageEvent` – transient event object emitted by the weapon subsystems and consumed by `damageSystem`.

## Systems Pipeline

1. **`weaponSystem`** (`src/systems/WeaponSystem.ts`)
   - Runs on every entity with `weapon` + `weaponState`.
   - Decrements cooldowns, reloads ammo clips, infers the weapon owner id, and builds a `WeaponFiredEvent` when an entity is actively firing and is off cooldown.
   - Derives the firing direction using the current `targetId` (resolved via `getEntityById` or world scan) and uses Rapier bodies for precise origins when present.
   - Emits events instead of applying damage directly, keeping weapon behaviours decoupled.

2. **`hitscanSystem`** (`src/systems/HitscanSystem.ts`)
   - Consumes `WeaponFiredEvent`s with type `gun`.
   - Applies weapon spread using the passed RNG, performs Rapier raycasts when possible, and falls back to ECS proximity heuristics.
   - Filters out friendlies and the firing entity. Emits `DamageEvent` plus `ImpactEvent` data for future FX systems.

3. **`projectileSystem`** (`src/systems/ProjectileSystem.ts`)
   - Spawns projectile entities for weapons of type `rocket`, populating `ProjectileComponent` data (owner, team, damage, AOE, homing target).
   - Advances projectile positions using Rapier rigid bodies when available, handles lifespan expiry, steers homing projectiles, and performs collision / AOE resolution.
   - Emits `DamageEvent`s tagged with the projectile owner.

4. **`beamSystem`** (`src/systems/BeamSystem.ts`)
   - Builds beam entities for `laser` weapons which stay active while the weapon is firing.
   - Applies tick damage to enemies intersecting the beam volume on a configurable cadence and updates beam origins from the owning entity each frame.

5. **`damageSystem`** (`src/systems/DamageSystem.ts`)
   - Applies accumulated `DamageEvent`s, emits `DeathEvent`s, and keeps health components in sync. Follow-up systems (`RespawnSystem`, `ScoringSystem`) react to these death events.

`src/components/Simulation.tsx` wires the systems together each frame inside the React render loop. It supplies the deterministic RNG, fixed timestep, and Rapier world handle to systems that need physics queries.

## Usage

Robot prefabs created via `createRobotEntity` or `robots/robotPrefab.ts` attach both `weapon` and `weaponState` components. Higher level AI (`AISystem`) is responsible for setting `weaponState.firing` and `targetId`. Once those flags are set, the simulation loop takes care of cooldowns, projectile spawning, beam visuals, and damage.

When adding a new weapon variant:

1. Extend `WeaponComponent` with any extra parameters needed (e.g. burst length, charge timings).
2. Ensure the emitting system understands the new type or add a new system that consumes `WeaponFiredEvent`s without breaking existing types.
3. Update docs/tests to cover the new behaviour and, if visuals are required, add a renderer similar to `Beam` or `Projectile` in `src/components`.

## Testing

Vitest suites under `tests/` cover deterministic targeting, cooldowns, projectile AOE, homing behaviour, beam tick damage, and seeded RNG helpers (`weapon-targeting.test.ts`, `weapon-cooldown.test.ts`, `weapon-projectile-behavior.test.ts`, etc.). These tests operate purely on the ECS world, making them fast and reproducible.

## Next Steps

- Finish authoring developer-facing examples/snippets (e.g. `docs/weapons.md` usage snippets) and cross-link from `SPEC.md`.
- Profile projectile pooling/allocation; current implementation spawns and destroys projectiles directly via the ECS world.
- Hook the emitted `ImpactEvent`s into a future FX system to drive particle flashes and audio.
