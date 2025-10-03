# Phase 1 — Data Model

Date: 2025-10-03

Entities and canonical field shapes (TypeScript-like pseudotypes):

- Robot (entity)
  - id: string (deterministic gameplay ID)
  - position: { x:number, y:number, z:number }
  - rigidId?: string
  - team: 'A' | 'B' | number
  - health: { current:number, max:number }
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

- invulnerableUntil comparisons must use StepContext.simNowMs.

- Projectile.ownerId must be preserved even if owner is destroyed; scoring must use
  ownerId from projectile.

Next: Generate contracts for ScoringSystem, RespawnSystem, and Observability read API.

<!-- eof -->