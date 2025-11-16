---
# Data Model — Weapon Diversity Feature (005)

## Entities

### WeaponProfile
- id: string
- name: string
- archetype: 'gun' | 'laser' | 'rocket'
- baseDamage: number
- rateOfFire: number
- ammoOrEnergy: number
- projectileSpeed: number (if applicable)
- aoeRadius: number (rocket only)
- aoeFalloffProfile: string (rocket only)
- beamDuration: number (laser only)
- tickRate: number (laser only)
- tracerConfig: object
- visualRefs: object

### BalanceMultipliers
- advantageMultiplier: number (default 1.25)
- disadvantageMultiplier: number (default 0.85)
- neutralMultiplier: number (default 1.0)

### ProjectileInstance
- id: string
- weaponProfileId: string
- ownerId: string
- position: [x, y, z]
- velocity: [vx, vy, vz]
- timestampMs: number
- contactEventId: string

### ExplosionEvent
- id: string
- origin: [x, y, z]
- radius: number
- timestampMs: number
- damageProfileId: string

### WeaponVisual
- iconRef: string
- modelRef: string
- firingSfxRef: string
- impactVfxRef: string
- beamVfxRef: string
- trailVfxRef: string

### WeaponTelemetry
- events: array of { type: string, matchId: string, weaponProfileId: string, attackerId: string, targetId: string, amount: number, timestampMs: number }

### TelemetryAggregator
- matchId: string
- eventCountsByType: object
- damageTotalsByWeapon: object
- winCountsByArchetype: object
- timestampMs: number

---
## Relationships
- WeaponProfile is referenced by ProjectileInstance, WeaponTelemetry, and ExplosionEvent.
- BalanceMultipliers are applied in damage calculation between WeaponProfile and target archetype.
- TelemetryAggregator summarizes WeaponTelemetry events per match.

---
## Validation Rules
- Archetype must be one of 'gun', 'laser', 'rocket'.
- Multipliers must be positive numbers.
- AoE radius and falloff must be defined for rockets.
- Beam duration and tick rate must be defined for lasers.
- Telemetry events must include matchId and weaponProfileId.
