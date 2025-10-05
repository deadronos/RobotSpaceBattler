# Phase 1 — Data Model

Date: 2025-10-03

Entities and canonical field shapes (TypeScript-like pseudotypes):

- Robot (entity)
  - id: string (deterministic gameplay ID - canonicalized to string via idFactory)
  - position: { x: number, y: number, z: number }
  - rigidRef?: unknown // runtime-only Rapier RigidBody reference (non-serializable)
  - rigidId?: string // optional serializable identifier for mapping to rigid bodies
  - team: 'red' | 'blue' | number // canonical team values: prefer 'red'|'blue'
  - health: { current: number, max: number, alive: boolean } // canonical health shape
  - weapon?: WeaponPayload
  - weaponState?: WeaponState
  - ai?: AIState
  - invulnerableUntil?: number // simNowMs timestamp while invulnerable

- Projectile (entity)
  - id: string (deterministic)
  - ownerId: string
  - ownerTeam: string|number
  - team: string|number
  - position: { x:number, y:number, z:number }
  - velocity: { x:number, y:number, z:number }
  - lifespanMs: number
  - spawnedAtMs: number
  - aoeRadius?: number
  - damage: number

- Beam (entity)
  - id: string
  - origin: { x,y,z }
  - direction: { x,y,z }
  - ticksRemaining: number
  - tickIntervalMs: number
  - damagePerTick: number

- DeathAuditEntry (runtime event log item)
  - id: string (deterministic: "{frame}-{simNow}-{seq}")
  - simNowMs: number
  - frameCount: number
  - victimId: string
  - killerId?: string
  - victimTeam: string|number
  - killerTeam?: string|number
  - classification: 'opponent' | 'friendly-fire' | 'suicide'
  - scoreDelta: number

Runtime event log:

- Structure: ring buffer of DeathAuditEntry; capacity default = 100; append-only during
  simulation; read API returns ordered list newest-first or oldest-first per consumer
  preference.

Notes & validation rules:

- IDs used in gameplay and audit must be stable and reproducible for the same seed and
  StepContext.

- ID canonicalization: Gameplay and audit IDs MUST be strings. Implementations may
  temporarily accept numeric ids, but before logging or exporting they MUST be
  converted to the canonical string format returned by the repo's idFactory
  (for example: `"{frameCount}-{simNowMs}-{seq}"` or seeded-id helpers). Tests
  MUST assert string-typed ids for audit entries.

- invulnerableUntil comparisons must use StepContext.simNowMs.

- Projectile.ownerId must be preserved even if owner is destroyed; scoring must use
  ownerId from projectile.

- TeamScore / ScoreBoard (new)
  - TeamScore { team: string|Team, score: number }
  - ScoreBoard { scores: Record<string, number>, lastUpdatedMs: number }
  - Purpose: ScoringSystem writes deterministic score deltas into the ScoreBoard
    component/service. Tests should assert ScoreBoard state after deterministic
    sequences of DeathEvents.

- Spawn data shapes (new)
  - SpawnZone { id: string, team?: string|Team, spawnPoints: SpawnPoint[],
      capacity?: number }
  - SpawnPoint { id: string, position: { x:number, y:number, z:number } }
  - SpawnRequest { entityId: string, team: string|Team, respawnAtMs: number,
      retries?: number, spawnZoneId?: string }
  - SpawnQueue { zoneId: string, requests: SpawnRequest[], maxPerZone?: number }

  Defaults (to be used by RespawnSystem):

  - minSpawnDistance = 3.0 // units (meters) default minimum allowed distance from enemy
  - maxSpawnRetries = 10 // attempts before fallback
  - maxSpawnPerZone = 3 // concurrent pending respawns per zone

  Note: RespawnSystem MUST draw any randomized offsets from StepContext.rng so
  placements are deterministic under identical seeds.

Next: Generate contracts for ScoringSystem, RespawnSystem, and Observability read API.

- WeaponPayload (persisted weapon data)

  - WeaponPayload defines the minimal persisted fields for a weapon attached to an
    entity. Implementations may keep richer runtime-only `WeaponComponent` types in
    `src/ecs/weapons.ts`, but persisted payloads used in tests and serialization
    SHOULD conform to this shape.

  - Schema (canonical persisted shape):

    - id: string // weapon identifier
    - type: 'gun'|'laser'|'rocket' // weapon family
    - power: number // base damage per hit or projectile
    - range?: number // effective range in units
    - cooldownMs?: number // cooldown in milliseconds
    - accuracy?: number // 0..1 probability modifier for hits (use StepContext.rng)
    - spreadRad?: number // cone spread in radians (use StepContext.rng)
    - ammo?: { clip: number, clipSize: number, reserve: number }
    - energyCost?: number
    - projectilePrefab?: string // optional prefab/id for projectile instantiation
    - aoeRadius?: number
    - beamParams?: { durationMs?: number, width?: number, tickIntervalMs?: number, damagePerTick?: number }
    - flags?: { continuous?: boolean, chargeable?: boolean, burst?: boolean, homing?: boolean }

  - Determinism note: any weapon behavior that uses randomness (accuracy/spread,
    randomized offsets) MUST draw values from StepContext.rng so that weapon
    resolution is reproducible in deterministic tests. Persisted payloads should
    not contain transient runtime RNG state.

<!-- eof -->