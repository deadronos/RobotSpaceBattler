Projectile model — summary

Location & entrypoints:
- `src/systems/ProjectileSystem.ts` — exported `projectileSystem(...)` responsible for creating and stepping projectile entities.
- `src/components/Projectile.tsx` — visual representation (render-only) of projectile entities / streaks.

Responsibilities:
- Spawn projectile entities in response to `WeaponFiredEvent` entries when `fireEvent.type` indicates projectile (e.g., `rocket`).
- Create deterministic entity ids using provided `stepContext.idFactory` and attach `projectile` component with: `damage`, `aoeRadius`, `lifespan`, `spawnTime`, `speed`, and optional `homing` parameters.
- Initialize projectile velocities from `fireEvent.direction * speed` and add to ECS world.
- Step existing projectile entities each tick: update position either via Rapier `RigidBody` translation when present or by integrating position from velocity when RigidBody is not used.
- Detect collisions using `checkProjectileCollision(...)`, and apply direct damage events or AoE damage via `applyAoEDamage(...)`.
- Remove projectiles when lifespan expires, on collision, or when they leave the arena bounds.
- Support optional homing behavior (`projectile.homing`) with `updateHomingBehavior(...)`.

Determinism & inputs:
- Requires a `StepContext` with `rng`, `simNowMs`, and `idFactory` to maintain deterministic spawning and timing.
- Collision checks may accept a Rapier adapter world when provided.

Events & outputs:
- Emits `damage` events on direct hits, or relies on `applyAoEDamage` to push damage events for area effects.

Design notes / constraints:
- Projectiles are first-class ECS entities (not just visual effects) to allow physics-based interactions and deterministic removal.
- Projectile lifespan, speed, and damage are supplied by the source weapon and are per-weapon properties.
- For homing projectiles, behavior is modularized into `updateHomingBehavior` and uses `rng` for any random steering as needed.

Files/functions to inspect:
- `src/systems/WeaponSystem.ts` (weaponFired events creation)
- `src/systems/CollisionHelpers.ts` or equivalent (where `checkProjectileCollision` and `applyAoEDamage` live) — see `src/systems/ProjectileSystem.ts` for direct references.
- `src/components/Projectile.tsx` for visual mapping of projectile entity fields.
