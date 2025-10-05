Weapons subsystem — summary

Location & entrypoint:
- `src/systems/WeaponSystem.ts` — exported function `weaponSystem(...)`.

Responsibilities:
- Scan entities with `weapon` and `weaponState` components and manage firing behavior (cooldowns, ammo, reloading, charging).
- Determine firing direction using entity target or fallback orientation and compute origin/direction for weapon fire events.
- Generate deterministic `weaponFired` events using an injected `idFactory()` and `stepContext.simNowMs`.
- Consume ammo and set reload/continuous flags; supports `continuous` (sustained fire) and `chargeable` flags.
- Ensures deterministic inputs by requiring `stepContext.simNowMs`, a deterministic `rng` and an `idFactory` when called in object-param style.

Events & outputs:
- Emits `WeaponFiredEvent` objects with fields: `id`, `weaponId`, `ownerId`, `type`, `origin`, `direction`, `targetId`, `timestamp`.
- Also populates `damage` event list where applicable (via other systems).

Design notes / constraints:
- Supports two calling patterns: positional and object-parameter. For deterministic behavior prefer the object-parameter API with `stepContext` containing `simNowMs`, `rng`, and `idFactory`.
- Weapon behavior is intentionally small/encapsulated; expansion (e.g., nuanced reload time, charge behavior) should be implemented as small, pure helpers.
- Weapon ownership and `ownerId` are normalized to gameplay ids via `getGameplayId`/`ensureGameplayId`.

Files to inspect for related behavior:
- `src/systems/HitscanSystem.ts` — consumes weaponFired events for hitscan weapons.
- `src/systems/ProjectileSystem.ts` — consumes weaponFired events for projectile-type weapons (e.g., rockets).
- `src/components/Projectile.tsx` & `src/components/Beam.tsx` — visual components used when weapons produce projectiles or beams.
