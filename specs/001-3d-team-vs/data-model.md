# Data Model: 3D Team vs Team Autobattler (As Implemented)

- **Feature**: 001-3d-team-vs
- **Date**: 2025-10-06
- **Status**: As Implemented

This document reflects the current TypeScript entity and state shapes used by the repository.

## Core Types

### TeamId

- `"red" | "blue"`

Defined in `src/lib/teamConfig.ts`.

### Vec3

- `{ x: number; y: number; z: number }`

Defined in `src/lib/math/vec3.ts`.

## ECS Entities

All simulation entities live in a Miniplex `World<BattleEntity>` and are discriminated by a `kind` field.

### RobotEntity

**Purpose**: Autonomous combatant with team affiliation, health, weapon, and AI state.

**Key fields** (see `src/ecs/world.ts` for the full shape):

- `id: string`
- `kind: "robot"`
- `team: TeamId`
- `position: Vec3`
- `velocity: Vec3`
- `orientation: number` (radians)
- `speed: number`
- `weapon: "laser" | "gun" | "rocket"`
- `fireCooldown: number` (seconds until next shot)
- `fireRate: number` (shots/sec)
- `health: number`
- `maxHealth: number`
- `ai: RobotAIState`
- `kills: number`
- `isCaptain: boolean`
- `spawnIndex: number`
- `lastDamageTimestamp: number` (ms)
- Optional status: `slowMultiplier?`, `statusFlags?`, `statusExpirations?`

#### RobotAIState

**Purpose**: Encodes the robot's current behavior, target selection, and navigation intent.

- `mode: "seek" | "engage" | "retreat"`
- `targetId?: string`
- `directive?: "offense" | "defense" | "balanced"`
- `anchorPosition?: Vec3 | null`
- `anchorDistance?: number | null`
- `strafeSign?: 1 | -1`
- `targetDistance?: number | null`
- `visibleEnemyIds?: string[]`
- `enemyMemory?: Record<string, { position: Vec3; timestamp: number }>`
- `searchPosition?: Vec3 | null`
- `roamTarget?: Vec3 | null`
- `roamUntil?: number | null`
- `blockedFrames?: number`

### ProjectileEntity

**Purpose**: Weapon discharge with a trajectory and damage payload.

**Key fields**:

- `id: string`
- `kind: "projectile"`
- `team: TeamId`
- `shooterId: string`
- `weapon: "laser" | "gun" | "rocket"`
- `position: Vec3`
- `velocity: Vec3`
- `damage: number` (base damage; multiplier applied on hit)
- `maxLifetime: number` (ms)
- `spawnTime: number` (ms)
- `distanceTraveled: number`
- `maxDistance: number`
- `speed: number`

Optional guidance/visual fields include:

- `targetId?`
- `projectileSize?`
- `projectileColor?`
- `trailColor?`
- `aoeRadius?`
- `explosionDurationMs?`
- `beamWidth?`
- `impactDurationMs?`
- `instanceIndex?`

### EffectEntity

**Purpose**: Short-lived visuals (impact flashes, explosions).

- `id: string`
- `kind: "effect"`
- `effectType: "explosion" | "impact" | "laser-impact"`
- `position: Vec3`
- `radius: number`
- `color: string`
- `secondaryColor?: string`
- `createdAt: number` (ms)
- `duration: number` (ms)
- `instanceIndex?: number`

### ObstacleEntity

**Purpose**: Arena obstacles (barriers, hazards, destructible cover).

The obstacle model supports:

- Static/dynamic positioning (`position`, optional `orientation`)
- Shape metadata (`shape: box | circle`) for AI/pathing checks
- Simulation behaviors:
  - moving barriers (`movementPattern`)
  - hazards (`hazardSchedule`, `hazardEffects`)
  - destructible cover (`durability`, `maxDurability`)

See `src/ecs/world.ts` for the full shape.

## ECS Container

### BattleWorld

**Purpose**: Top-level container for the ECS world, typed entity stores, team config, and global counters.

Key members:

- `world: World<BattleEntity>`
- `robots`, `projectiles`, `effects`, `obstacles`: entity stores
- `teams: Record<TeamId, TeamConfig>`
- `state: BattleWorldState`
- `rapierWorld?: RapierWorld` (optional injection)

### BattleWorldState

- `elapsedMs: number`
- `nextProjectileId: number`
- `nextEffectId: number`
- `seed: number`
- `frameIndex: number`

## Match Lifecycle State

### MatchStateSnapshot

The UI layer uses a match state snapshot:

- `phase: "initializing" | "running" | "paused" | "victory"`
- `elapsedMs: number`
- `restartTimerMs: number | null`
- `winner: TeamId | null`

Defined in `src/runtime/state/matchStateMachine.ts`.

## Telemetry (Aggregated Stats)

The project records match telemetry in a Zustand store:

- events: spawn/fire/damage/death plus obstacle-related events
- aggregates per robot: shots fired, damage dealt/taken, kills, deaths
- aggregates per team: spawns, shots fired, damage dealt/taken, deaths

Defined in `src/state/telemetryStore.ts`.

