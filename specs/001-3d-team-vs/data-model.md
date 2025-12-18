# Data Model: 3D Team vs Team Autobattler (As Implemented)

**Feature**: 001-3d-team-vs  \
**Date**: 2025-10-06  \
**Status**: As Implemented

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
- Optional guidance/visual fields: `targetId?`, `projectileSize?`, `projectileColor?`, `trailColor?`, `aoeRadius?`, `explosionDurationMs?`, `beamWidth?`, `impactDurationMs?`, `instanceIndex?`

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
# Data Model: 3D Team vs Team Autobattler

**Feature**: 001-3d-team-vs  
**Date**: 2025-10-06  
**Status**: Design Complete

## Entity Archetypes

### Robot Entity

**Purpose**: Autonomous combatant with team affiliation, health, weapons, and AI state

**Fields**:
- `id`: string (unique identifier)
- `team`: "red" | "blue" (team affiliation)
- `position`: Vector3 (x, y, z world coordinates)
- `rotation`: Quaternion (orientation)
- `velocity`: Vector3 (current movement vector)
- `health`: number (0-100, eliminated at 0)
- `maxHealth`: number (100)
- `weaponType`: "laser" | "gun" | "rocket"
- `isCaptain`: boolean (team leader flag)
- `aiState`: AIState (see below)
- `stats`: RobotStats (see below)

**Relationships**:
- Belongs to exactly one Team (via `team` field)
- Equipped with exactly one Weapon (via `weaponType` reference)
- Can spawn multiple Projectile entities when firing

**Validation Rules**:
- `health` must be >= 0 and <= `maxHealth`
- `team` must be either "red" or "blue"
- `weaponType` must be one of three valid types
- Only one robot per team can have `isCaptain = true` at any time
- `position.y` must be >= 0 (ground level or above)

**State Transitions**:
```text
Spawned → Active → (hit) → Damaged → (health = 0) → Eliminated
                 ↓
              (elected) → Captain → (captain dies) → Re-election
```

**AIState Sub-object**:
- `behaviorMode`: "aggressive" | "defensive" | "retreating"
- `targetId`: string | null (current enemy target)
- `coverPosition`: Vector3 | null (current cover location)
- `lastFireTime`: number (timestamp of last weapon discharge)
- `formationOffset`: Vector3 (offset from captain, if following formation)

**RobotStats Sub-object**:
- `kills`: number (enemies eliminated)
- `damageDealt`: number (total damage dealt)
- `damageTaken`: number (total damage received)
- `timeAlive`: number (seconds survived)
- `shotsFired`: number (weapon discharge count)

---

### Weapon Entity

**Purpose**: Offensive capability with type-specific damage, fire rate, and projectile behavior

**Fields**:
- `type`: "laser" | "gun" | "rocket"
- `baseDamage`: number (base damage before multipliers)
- `fireRate`: number (seconds between shots)
- `projectileSpeed`: number (units per second)
- `effectiveRange`: number (optimal engagement distance)
- `visualEffect`: "beam" | "tracer" | "exhaust" (rendering hint)

**Relationships**:
- Equipped by exactly one Robot at a time
- Spawns Projectile entities when fired

**Validation Rules**:
- `baseDamage` must be > 0
- `fireRate` must be > 0 (minimum cooldown)
- `projectileSpeed` must be > 0
- `effectiveRange` must be > 0

**Type-Specific Properties**:
| Type   | Base Damage | Fire Rate | Speed | Range | Visual Effect |
|--------|-------------|-----------|-------|-------|---------------|
| Laser  | 15          | 0.5s      | 100   | 30    | beam          |
| Gun    | 20          | 0.8s      | 75    | 40    | tracer        |
| Rocket | 30          | 1.5s      | 50    | 50    | exhaust       |

**Damage Multipliers** (Rock-Paper-Scissors):
- Laser vs Gun: 1.5x
- Gun vs Rocket: 1.5x
- Rocket vs Laser: 1.5x
- Opposite matchups: 0.67x
- Same type: 1.0x

---

### Projectile Entity

**Purpose**: Active weapon discharge with trajectory, collision, and damage-on-impact

**Fields**:
- `id`: string (unique identifier)
- `ownerId`: string (robot that fired this projectile)
- `weaponType`: "laser" | "gun" | "rocket"
- `position`: Vector3 (current position)
- `velocity`: Vector3 (movement vector)
- `damage`: number (final damage after multipliers calculated at spawn)
- `distanceTraveled`: number (units traveled since spawn)
- `maxDistance`: number (despawn threshold)
- `spawnTime`: number (timestamp)
- `maxLifetime`: number (seconds before despawn)

**Relationships**:
- Created by exactly one Robot (via `ownerId`)
- Carries damage from one Weapon type
- Collides with exactly one Robot (or obstacle) before despawn

**Validation Rules**:
- `damage` must be > 0
- `distanceTraveled` must be <= `maxDistance`
- `velocity` magnitude must match weapon's `projectileSpeed`
- Age (now - `spawnTime`) must be <= `maxLifetime`

**State Transitions**:
```text
Spawned → Flying → (collision) → Impact → Despawn
                 ↓
              (max distance/lifetime) → Despawn
```

**Despawn Conditions**:
- Collision with robot or obstacle
- `distanceTraveled` >= `maxDistance`
- Age >= `maxLifetime`
- Owner eliminated (optional cleanup)

---

### Team Entity

**Purpose**: Group of robots with shared goal, captain, and aggregate stats

**Fields**:
- `name`: "red" | "blue"
- `activeRobots`: number (count of robots with health > 0)
- `eliminatedRobots`: number (count of robots with health = 0)
- `captainId`: string | null (current captain robot ID)
- `spawnZone`: BoundingBox (spawn area min/max coordinates)
- `aggregateStats`: TeamStats (see below)

**Relationships**:
- Contains 0-10 Robot entities (via `team` field match)
- Has exactly one captain Robot (via `captainId`)

**Validation Rules**:
- `activeRobots` + `eliminatedRobots` must equal 10 (initial team size)
- `activeRobots` must be >= 0
- If `activeRobots` > 0, `captainId` must not be null
- `spawnZone` must not overlap with opposite team's spawn zone

**TeamStats Sub-object**:
- `totalKills`: number
- `totalDamageDealt`: number
- `totalDamageTaken`: number
- `averageHealthRemaining`: number
- `weaponDistribution`: { laser: number, gun: number, rocket: number }

**Victory Condition**:
- `activeRobots` = 0 for one team AND > 0 for other team

---

### Arena Entity

**Purpose**: Space-station battlefield environment with spawn zones, obstacles, lighting

**Fields**:
- `id`: "main-arena"
- `dimensions`: Vector3 (width, depth, height)
- `spawnZones`: SpawnZone[] (designated starting areas)
- `obstacles`: Obstacle[] (cover positions)
- `lightingConfig`: LightingConfig (see below)
- `boundaries`: BoundingBox (playable area)

**Relationships**:
- Contains two SpawnZone entries (one per team)
- Contains multiple Obstacle entries (cover points)
- Referenced by physics world for collision boundaries

**Validation Rules**:
- `dimensions` must be > 0 for all axes
- `spawnZones.length` must equal 2
- Spawn zones must not overlap
- All obstacles must be within `boundaries`

**SpawnZone Sub-object**:
- `team`: "red" | "blue"
- `center`: Vector3
- `radius`: number
- `spawnPoints`: Vector3[] (exact 10 positions)

**Obstacle Sub-object**:
- `position`: Vector3
- `dimensions`: Vector3 (box dimensions)
- `isCover`: boolean (usable for AI cover-seeking)

**LightingConfig Sub-object**:
- `ambientColor`: Color (hex)
- `ambientIntensity`: number (0-1)
- `directionalLightPosition`: Vector3
- `directionalLightIntensity`: number (0-2)
- `shadowsEnabled`: boolean
- `shadowQuality`: "low" | "medium" | "high"

---

### Simulation State Entity

**Purpose**: Overall game state including running/paused/completed status, winner, frame timing

**Fields**:
- `status`: "initializing" | "running" | "paused" | "victory" | "simultaneous-elimination"
- `winner`: "red" | "blue" | "draw" | null
- `frameTime`: number (delta time in ms)
- `totalFrames`: number (frame counter)
- `simulationTime`: number (elapsed time in seconds)
- `timeScale`: number (1.0 = normal speed, 0.75 = slow-motion)
- `victoryScreenStartTime`: number | null (timestamp when victory screen appeared)
- `autoRestartCountdown`: number (seconds remaining until auto-restart)
- `performanceStats`: PerformanceStats (see below)

**Relationships**:
- References winner Team (via `winner` field)
- Affects all System update rates (via `timeScale`)

**Validation Rules**:
- `status` must be one of five valid states
- `winner` must be null unless `status` = "victory"
- `timeScale` must be > 0 and <= 1.0
- `frameTime` should be ~16.67ms for 60 fps (monitored, not enforced)
- `autoRestartCountdown` must be >= 0 and <= 5

**State Transitions**:
```text
initializing → running → (all eliminated one side) → victory → (countdown) → initializing
                       ↓                                       ↑
                    paused ----------------------------------------
                       ↓
               (both teams eliminated) → simultaneous-elimination → initializing
```

**PerformanceStats Sub-object**:
- `currentFPS`: number (frames per second)
- `averageFPS`: number (rolling average over 1 second)
- `qualityScalingActive`: boolean
- `shadowsEnabled`: boolean
- `particleCount`: number
- `drawDistance`: number

---

## Entity Lifecycle Examples

### Robot Spawn Lifecycle

```text
1. Simulation initializes → Team entities created
2. Team.spawnZone positions allocated (10 per team)
3. Robot entities created:
   - Position = spawnZone.spawnPoints[index]
   - Team = "red" | "blue"
   - Health = 100
   - WeaponType = randomly assigned (even distribution)
   - IsCaptain = false (initially)
4. Captain election: Elect the active robot with the highest current health as the team's captain. If
   multiple robots share the same highest health, apply deterministic tie-breakers in the following order:
   (a) robot with the higher `stats.kills`; (b) robot with the smallest euclidean distance to the team's
   spawn center; (c) lexicographically smallest `id` to guarantee a deterministic, reproducible choice. If
   all candidates are functionally equivalent `id` ordering ensures stability. Set the chosen robot's
   `isCaptain = true` and update `Team.captainId` accordingly. This election occurs at spawn and
   immediately whenever the current captain is eliminated.
5. Physics bodies created in Rapier for each robot
6. Robot transitions to Active state
```

### Combat Lifecycle

```
1. Robot AI detects enemy in range
2. Target selection: prioritize rock-paper-scissors advantage
3. Fire weapon: check lastFireTime >= fireRate
4. Projectile entity spawned:
   - Position = robot.position
   - Velocity = direction to target * weapon.projectileSpeed
   - Damage = weapon.baseDamage * multiplier(robot.weapon, target.weapon)
5. Projectile flies: position updated each frame via physics
6. Collision detected: projectile hits robot
7. Damage applied: target.health -= projectile.damage
8. If target.health <= 0:
   - Target transitions to Eliminated
   - Attacker.stats.kills++
   - Target removed from physics world
   - If target.isCaptain: trigger captain re-election
9. Projectile despawned
```

### Victory Lifecycle

```
1. Team.activeRobots = 0 detected
2. SimulationState.status = "victory"
3. SimulationState.winner = opposite team
4. VictoryScreen component renders
5. autoRestartCountdown starts at 5 seconds
6. Each second: autoRestartCountdown--
7. If countdown reaches 0:
   - Clear all entities
   - Reset teams
   - Re-initialize robots
   - SimulationState.status = "initializing" → "running"
```

---

## Query Patterns

### Common Miniplex Queries

```typescript
// All active robots on a team
world.with("team", "health", "position").where(e => 
  e.team === "red" && e.health > 0
)

// All captains
world.with("isCaptain", "team").where(e => e.isCaptain === true)

// Robots in cover-seeking mode
world.with("aiState").where(e => 
  e.aiState.behaviorMode === "defensive"
)

// Active projectiles
world.with("projectile", "position", "velocity")

// Low-health robots (retreat candidates)
world.with("health", "aiState").where(e => 
  e.health < 30 && e.health > 0
)

// Enemies within range of a robot
function enemiesInRange(robot: Robot, range: number) {
  return world.with("team", "position", "health").where(e =>
    e.team !== robot.team &&
    e.health > 0 &&
    distance(e.position, robot.position) <= range
  )
}
```

---

## Data Integrity Rules

1. **Captain Uniqueness**: Each team must have exactly one captain when `activeRobots` > 0. Captain
   selection MUST follow the "Captain Election Rules" (highest health + deterministic tie-breakers).
2. **Team Balance**: Both teams must start with exactly 10 robots
3. **Health Bounds**: Robot health must always be 0 <= health <= maxHealth
4. **Projectile Ownership**: Every projectile MUST have a valid `ownerId` that references an existing robot
   (or, in the case of immediate cleanup cycles, a recently-eliminated robot record preserved long enough
   for the projectile collision handling to attribute damage).
5. **Position Validity**: All entity positions must be within arena boundaries
6. **Physics Sync**: ECS entity positions must match Rapier physics body positions (sync every frame)

---

**Status**: ✅ Data model complete, ready for contract generation
