import type { World as RapierWorld } from '@dimforge/rapier3d-compat';
import { World } from 'miniplex';

import {
  addVec3,
  cloneVec3,
  distanceSquaredVec3,
  Vec3,
  vec3,
} from '../lib/math/vec3';
import { TEAM_CONFIGS, TeamConfig, TeamId } from '../lib/teamConfig';
import { qualityManager } from '../state/quality/QualityManager';
import {
  createVisualInstanceManager,
  VisualInstanceCategory,
  VisualInstanceManager,
} from '../visuals/VisualInstanceManager';
import { createEffectPool, EffectPool } from './pools/EffectPool';
import { createProjectilePool, ProjectilePool } from './pools/ProjectilePool';

export type { TeamId } from '../lib/teamConfig';

/**
 * Supported weapon types.
 */
export type WeaponType = 'laser' | 'gun' | 'rocket';

/**
 * Represents a memory of an enemy's position.
 */
export interface EnemyMemoryEntry {
  /** The last known position of the enemy. */
  position: Vec3;
  /** The timestamp when this position was recorded. */
  timestamp: number;
}

/**
 * State of a robot's AI.
 */
export interface RobotAIState {
  /** The current behavioral mode. */
  mode: 'seek' | 'engage' | 'retreat';
  /** The ID of the current target entity. */
  targetId?: string;
  /** The strategic directive assigned to the robot. */
  directive?: 'offense' | 'defense' | 'balanced';
  /** The anchor position for defensive or holding behaviors. */
  anchorPosition?: Vec3 | null;
  /** Maximum distance allowed from the anchor position. */
  anchorDistance?: number | null;
  /** Direction of strafing movement (1 or -1). */
  strafeSign?: 1 | -1;
  /** Distance to the current target. */
  targetDistance?: number | null;
  /** IDs of enemies currently visible to this robot. */
  visibleEnemyIds?: string[];
  /** Memory of enemy positions, keyed by enemy ID. */
  enemyMemory?: Record<string, EnemyMemoryEntry>;
  /** Current search target position when no enemies are visible. */
  searchPosition?: Vec3 | null;
  /** Temporary roaming target position. */
  roamTarget?: Vec3 | null;
  /** Timestamp when the current roaming behavior expires. */
  roamUntil?: number | null;
}

/**
 * Entity representing a robot in the battle.
 */
export interface RobotEntity {
  /** Unique identifier for the robot. */
  id: string;
  /** Entity kind discriminator. */
  kind: 'robot';
  /** The team the robot belongs to. */
  team: TeamId;
  /** Current position of the robot. */
  position: Vec3;
  /** Current velocity of the robot. */
  velocity: Vec3;
  /** Current orientation (rotation around Y axis) in radians. */
  orientation: number;
  /** Current movement speed. */
  speed: number;
  /** The type of weapon equipped. */
  weapon: WeaponType;
  /** Time remaining until the weapon can fire again. */
  fireCooldown: number;
  /** Delay between shots (inverse of fire rate). */
  fireRate: number;
  /** Current health points. */
  health: number;
  /** Maximum health points. */
  maxHealth: number;
  /** AI state component. */
  ai: RobotAIState;
  /** Number of enemies killed. */
  kills: number;
  /** Whether this robot is the team captain. */
  isCaptain: boolean;
  /** Index of the spawn point used. */
  spawnIndex: number;
  /** Timestamp of the last damage received. */
  lastDamageTimestamp: number;
  /** Optional movement slow multiplier applied to the robot (1.0 = normal speed). */
  slowMultiplier?: number;
  /** Optional status flags applied to the robot (e.g., 'stunned', 'hazard:<id>'). */
  statusFlags?: string[];
  /** Optional per-flag expiry timers. Each entry expires at expiresAt (ms) and is removed automatically. */
  statusExpirations?: Array<{ flag: string; expiresAt: number }>;
}

/**
 * Entity representing a projectile in the battle.
 */
export interface ProjectileEntity {
  /** Unique identifier for the projectile. */
  id: string;
  /** Entity kind discriminator. */
  kind: 'projectile';
  /** The team that fired the projectile. */
  team: TeamId;
  /** The ID of the robot that fired the projectile. */
  shooterId: string;
  /** The type of weapon that fired the projectile. */
  weapon: WeaponType;
  /** Current position of the projectile. */
  position: Vec3;
  /** Current velocity of the projectile. */
  velocity: Vec3;
  /** Damage dealt on impact. */
  damage: number;
  /** Maximum lifetime of the projectile in milliseconds. */
  maxLifetime: number;
  /** Timestamp when the projectile was spawned. */
  spawnTime: number;
  /** Distance traveled so far. */
  distanceTraveled: number;
  /** Maximum distance the projectile can travel. */
  maxDistance: number;
  /** Speed of the projectile. */
  speed: number;
  /** ID of the target (for guided projectiles). */
  targetId?: string;
  /** Visual size of the projectile. */
  projectileSize?: number;
  /** Color of the projectile. */
  projectileColor?: string;
  /** Color of the projectile's trail. */
  trailColor?: string;
  /** Radius of effect for area damage. */
  aoeRadius?: number;
  /** Duration of the explosion visual effect. */
  explosionDurationMs?: number;
  /** Width of the beam (for laser weapons). */
  beamWidth?: number;
  /** Duration of the impact visual effect. */
  impactDurationMs?: number;
  /** Index for instanced rendering. */
  instanceIndex?: number;
}

/**
 * Entity representing a static or dynamic obstacle in the battle arena.
 */
export interface ObstacleEntity {
  /** Unique identifier for the obstacle. */
  id: string;
  /** Entity kind discriminator. */
  kind: 'obstacle';
  /** Obstacle subtype. */
  obstacleType: 'barrier' | 'hazard' | 'destructible';
  /** Current position. */
  position: Vec3;
  /** Orientation (rotation around Y axis) in radians. */
  orientation?: number;
  /** Shape metadata for blocking checks (box/circle). */
  shape?: { kind: 'box'; halfWidth: number; halfDepth: number } | { kind: 'circle'; radius: number };
  /** Whether obstacle blocks line-of-sight. */
  blocksVision?: boolean;
  /** Whether obstacle blocks movement/traversal. */
  blocksMovement?: boolean;
  /** Current active state (hazard active/inactive or barrier present). */
  active?: boolean;
  /** Durability for destructible cover. */
  durability?: number;
  /** Optional max durability (if destructible). */
  maxDurability?: number;
  /** Optional movement pattern (inline). */
  movementPattern?: {
    patternType: 'linear' | 'rotation' | 'oscillate';
    // linear
    points?: Vec3[];
    // rotation
    pivot?: Vec3;
    speed?: number; // units/sec or radians/sec for rotation
    loop?: boolean;
    pingPong?: boolean;
    // deterministic offset (0..1) used to seed initial phase
    phase?: number;
    // internal: progress (0..1) and direction for ping-pong
    progress?: number;
    direction?: 1 | -1;
  } | null;
    /** Hazard schedule (for hazard obstacles) */
    hazardSchedule?: { periodMs: number; activeMs: number; offsetMs?: number } | null;
    /** Effects applied while hazard is active */
    hazardEffects?: Array<{ kind: 'damage' | 'slow' | 'status'; amount: number; perSecond?: boolean; durationMs?: number }> | null;
}

/**
 * Types of visual effects.
 */
export type EffectType = 'explosion' | 'impact' | 'laser-impact';

/**
 * Entity representing a visual effect.
 */
export interface EffectEntity {
  /** Unique identifier for the effect. */
  id: string;
  /** Entity kind discriminator. */
  kind: 'effect';
  /** The type of visual effect. */
  effectType: EffectType;
  /** Position of the effect. */
  position: Vec3;
  /** Radius/size of the effect. */
  radius: number;
  /** Primary color of the effect. */
  color: string;
  /** Secondary color of the effect. */
  secondaryColor?: string;
  /** Timestamp when the effect was created. */
  createdAt: number;
  /** Duration of the effect in milliseconds. */
  duration: number;
  /** Index for instanced rendering. */
  instanceIndex?: number;
}

/**
 * Union type of all entities in the battle.
 */
export type BattleEntity = RobotEntity | ProjectileEntity | EffectEntity | ObstacleEntity;

/**
 * A store for holding entities of a specific type.
 * Provides optimized access to entities.
 */
export interface Store<T extends BattleEntity> {
  /** The list of entities in the store. */
  entities: T[];
}

/**
 * Global state of the battle world.
 */
export interface BattleWorldState {
  /** Time elapsed in the battle in milliseconds. */
  elapsedMs: number;
  /** ID counter for projectiles. */
  nextProjectileId: number;
  /** ID counter for effects. */
  nextEffectId: number;
  /** Random seed for the battle. */
  seed: number;
}

/**
 * The main container for the battle simulation.
 * Manages entities, physics, state, and subsystems.
 */
export interface BattleWorld {
  /** The underlying Miniplex world instance. */
  world: World<BattleEntity>;
  /** Store containing all robot entities. */
  robots: Store<RobotEntity>;
  /** Store containing all projectile entities. */
  projectiles: Store<ProjectileEntity>;
  /** Store containing all effect entities. */
  effects: Store<EffectEntity>;
  /** Store containing all obstacle entities. */
  obstacles: Store<ObstacleEntity>;
  /** Configuration for teams. */
  teams: Record<TeamId, TeamConfig>;
  /** Global battle state. */
  state: BattleWorldState;
  /** Optional Rapier physics world. */
  rapierWorld?: RapierWorld;
  /** Clears all entities and resets state. */
  clear: () => void;
  /**
   * Gets all robots belonging to a specific team.
   * @param team - The team ID.
   * @returns Array of robot entities.
   */
  getRobotsByTeam(team: TeamId): RobotEntity[];
  /** Visual system components. */
  visuals: {
    instanceManager: VisualInstanceManager;
  };
  /** Object pools. */
  pools: {
    projectiles: ProjectilePool;
    effects: EffectPool;
  };
  /**
   * Adds a projectile to the world.
   * @param projectile - The projectile entity to add.
   */
  addProjectile: (projectile: ProjectileEntity) => void;
  /**
   * Removes a projectile from the world and releases it to the pool.
   * @param projectile - The projectile entity to remove.
   */
  removeProjectile: (projectile: ProjectileEntity) => void;
  /**
   * Adds an effect to the world.
   * @param effect - The effect entity to add.
   */
  addEffect: (effect: EffectEntity) => void;
  /**
   * Removes an effect from the world and releases it to the pool.
   * @param effect - The effect entity to remove.
   */
  removeEffect: (effect: EffectEntity) => void;
}

/**
 * Creates a Vec3 helper function.
 * @param x - x component.
 * @param y - y component.
 * @param z - z component.
 * @returns A Vec3 object.
 */
export function toVec3(x = 0, y = 0, z = 0): Vec3 {
  return vec3(x, y, z);
}

function isRobotEntity(entity: BattleEntity): entity is RobotEntity {
  return entity.kind === 'robot';
}

function isProjectileEntity(entity: BattleEntity): entity is ProjectileEntity {
  return entity.kind === 'projectile';
}

function isObstacleEntity(entity: BattleEntity): entity is ObstacleEntity {
  return entity.kind === 'obstacle';
}

function isEffectEntity(entity: BattleEntity): entity is EffectEntity {
  return entity.kind === 'effect';
}

/**
 * Creates a store that caches entities of a specific type.
 * @param world - The Miniplex world.
 * @param predicate - Function to check if an entity belongs to the store's type.
 * @param getRevision - Function to get the current world revision number.
 * @returns A Store instance.
 */
function createEntityStore<T extends BattleEntity>(
  world: World<BattleEntity>,
  predicate: (entity: BattleEntity) => entity is T,
  getRevision: () => number,
): Store<T> {
  let cachedRevision = -1;
  let cachedEntities: T[] = [];

  return {
    get entities() {
      const revision = getRevision();
      if (revision !== cachedRevision) {
        cachedEntities = [];
        world.entities.forEach((entity) => {
          if (predicate(entity)) {
            cachedEntities.push(entity as T);
          }
        });
        cachedRevision = revision;
      }

      return cachedEntities;
    },
  };
}

function mapProjectileToCategory(projectile: ProjectileEntity): VisualInstanceCategory {
  if (projectile.weapon === 'rocket') {
    return 'rockets';
  }
  if (projectile.weapon === 'laser') {
    return 'lasers';
  }
  return 'bullets';
}

/**
 * Initializes and creates a new BattleWorld.
 * Sets up entity stores, object pools, and visual managers.
 * @returns A new BattleWorld instance.
 */
export function createBattleWorld(): BattleWorld {
  const world = new World<BattleEntity>();
  let worldRevision = 0;

  const notifyMutation = () => {
    worldRevision += 1;
  };

  const originalAdd = world.add.bind(world);
  world.add = ((entity: BattleEntity) => {
    const result = originalAdd(entity);
    notifyMutation();
    return result;
  }) as typeof world.add;

  const originalRemove = world.remove.bind(world);
  world.remove = ((entity: BattleEntity) => {
    const result = originalRemove(entity);
    notifyMutation();
    return result;
  }) as typeof world.remove;

  const originalClear = world.clear.bind(world);
  world.clear = (() => {
    const result = originalClear();
    notifyMutation();
    return result;
  }) as typeof world.clear;

  const getRevision = () => worldRevision;

  const robots = createEntityStore(world, isRobotEntity, getRevision);
  const projectiles = createEntityStore(world, isProjectileEntity, getRevision);
  const effects = createEntityStore(world, isEffectEntity, getRevision);
  const obstacles = createEntityStore(world, isObstacleEntity, getRevision);

  const state: BattleWorldState = {
    elapsedMs: 0,
    nextProjectileId: 0,
    nextEffectId: 0,
    seed: Date.now(),
  };

  const instancingConfig = qualityManager.getInstancingConfig();
  const instanceManager = createVisualInstanceManager({
    maxInstances: instancingConfig.maxInstances,
  });

  const projectilePool = createProjectilePool(
    instancingConfig.maxInstances.bullets + instancingConfig.maxInstances.rockets,
  );
  const effectPool = createEffectPool(instancingConfig.maxInstances.effects);

  const battleWorld: BattleWorld = {
    world,
    robots,
    projectiles,
    effects,
    obstacles,
    teams: TEAM_CONFIGS,
    state,
    visuals: {
      instanceManager,
    },
    pools: {
      projectiles: projectilePool,
      effects: effectPool,
    },
    clear: () => {
      Array.from(world.entities).forEach((entity) => {
        if (isProjectileEntity(entity)) {
          battleWorld.removeProjectile(entity);
        } else if (isEffectEntity(entity)) {
          battleWorld.removeEffect(entity);
        } else {
          world.remove(entity);
        }
      });
      instanceManager.reset();
      projectilePool.reset();
      effectPool.reset();
      state.nextProjectileId = 0;
      state.nextEffectId = 0;
    },
    getRobotsByTeam: (team: TeamId) =>
      robots.entities.filter((entity) => entity.team === team),
    addProjectile: (projectile: ProjectileEntity) => {
      world.add(projectile);
      const category = mapProjectileToCategory(projectile);
      const index = instanceManager.allocateIndex(category, projectile.id);
      projectile.instanceIndex = index ?? undefined;
    },
    removeProjectile: (projectile: ProjectileEntity) => {
      const category = mapProjectileToCategory(projectile);
      instanceManager.releaseIndex(category, projectile.id);
      world.remove(projectile);
      projectilePool.release(projectile);
    },
    addEffect: (effect: EffectEntity) => {
      world.add(effect);
      const index = instanceManager.allocateIndex('effects', effect.id);
      effect.instanceIndex = index ?? undefined;
    },
    removeEffect: (effect: EffectEntity) => {
      instanceManager.releaseIndex('effects', effect.id);
      world.remove(effect);
      effectPool.release(effect);
    },
  };

  return battleWorld;
}

/**
 * Resets the battle world to its initial state.
 * Clears all entities and resets the elapsed time.
 * @param world - The BattleWorld to reset.
 */
export function resetBattleWorld(world: BattleWorld): void {
  world.clear();
  world.state.elapsedMs = 0;
}

/**
 * Clones the position of a robot entity.
 * @param entity - The robot entity.
 * @returns A new Vec3 representing the robot's position.
 */
export function clonePosition(entity: RobotEntity): Vec3 {
  return cloneVec3(entity.position);
}

/**
 * Calculates the distance from a position to a team's spawn center.
 * @param team - The team ID.
 * @param position - The position to measure from.
 * @returns The distance to the spawn center.
 */
export function distanceToSpawnCenter(team: TeamId, position: Vec3): number {
  const center = TEAM_CONFIGS[team].spawnCenter;
  return Math.sqrt(distanceSquaredVec3(position, center));
}

/**
 * Retrieves the configuration for a specific team.
 * @param team - The team ID.
 * @returns The TeamConfig object.
 */
export function getTeamConfig(team: TeamId): TeamConfig {
  return TEAM_CONFIGS[team];
}

/**
 * Calculates a position relative to a team's spawn center.
 * @param team - The team ID.
 * @param offset - The offset vector from the spawn center.
 * @returns The absolute world position.
 */
export function translateFromSpawn(team: TeamId, offset: Vec3): Vec3 {
  const config = TEAM_CONFIGS[team];
  return addVec3(config.spawnCenter, offset);
}
