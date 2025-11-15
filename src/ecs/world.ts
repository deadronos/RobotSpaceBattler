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
import { createEffectPool, EffectPool } from './pools/EffectPool';
import { createProjectilePool, ProjectilePool } from './pools/ProjectilePool';
import {
  VisualInstanceCategory,
  VisualInstanceManager,
  createVisualInstanceManager,
} from '../visuals/VisualInstanceManager';

export type { TeamId } from '../lib/teamConfig';

export type WeaponType = 'laser' | 'gun' | 'rocket';

export interface EnemyMemoryEntry {
  position: Vec3;
  timestamp: number;
}

export interface RobotAIState {
  mode: 'seek' | 'engage' | 'retreat';
  targetId?: string;
  directive?: 'offense' | 'defense' | 'balanced';
  anchorPosition?: Vec3 | null;
  anchorDistance?: number | null;
  strafeSign?: 1 | -1;
  targetDistance?: number | null;
  visibleEnemyIds?: string[];
  enemyMemory?: Record<string, EnemyMemoryEntry>;
  searchPosition?: Vec3 | null;
  // Roaming support: a temporary search/roam target and expiry timestamp (ms)
  roamTarget?: Vec3 | null;
  roamUntil?: number | null;
}

export interface RobotEntity {
  id: string;
  kind: 'robot';
  team: TeamId;
  position: Vec3;
  velocity: Vec3;
  orientation: number;
  speed: number;
  weapon: WeaponType;
  fireCooldown: number;
  fireRate: number;
  health: number;
  maxHealth: number;
  ai: RobotAIState;
  kills: number;
  isCaptain: boolean;
  spawnIndex: number;
  lastDamageTimestamp: number;
}

export interface ProjectileEntity {
  id: string;
  kind: 'projectile';
  team: TeamId;
  shooterId: string;
  weapon: WeaponType;
  position: Vec3;
  velocity: Vec3;
  damage: number;
  maxLifetime: number;
  spawnTime: number;
  distanceTraveled: number;
  maxDistance: number;
  speed: number;
  targetId?: string;
  projectileSize?: number;
  projectileColor?: string;
  trailColor?: string;
  aoeRadius?: number;
  explosionDurationMs?: number;
  beamWidth?: number;
  impactDurationMs?: number;
  instanceIndex?: number;
}

export type EffectType = 'explosion' | 'impact' | 'laser-impact';

export interface EffectEntity {
  id: string;
  kind: 'effect';
  effectType: EffectType;
  position: Vec3;
  radius: number;
  color: string;
  secondaryColor?: string;
  createdAt: number;
  duration: number;
  instanceIndex?: number;
}

export type BattleEntity = RobotEntity | ProjectileEntity | EffectEntity;

export interface Store<T extends BattleEntity> {
  entities: T[];
}

export interface BattleWorldState {
  elapsedMs: number;
  nextProjectileId: number;
  nextEffectId: number;
  seed: number;
}

export interface BattleWorld {
  world: World<BattleEntity>;
  robots: Store<RobotEntity>;
  projectiles: Store<ProjectileEntity>;
  effects: Store<EffectEntity>;
  teams: Record<TeamId, TeamConfig>;
  state: BattleWorldState;
  clear: () => void;
  getRobotsByTeam(team: TeamId): RobotEntity[];
  visuals: {
    instanceManager: VisualInstanceManager;
  };
  pools: {
    projectiles: ProjectilePool;
    effects: EffectPool;
  };
  addProjectile: (projectile: ProjectileEntity) => void;
  removeProjectile: (projectile: ProjectileEntity) => void;
  addEffect: (effect: EffectEntity) => void;
  removeEffect: (effect: EffectEntity) => void;
}

export function toVec3(x = 0, y = 0, z = 0): Vec3 {
  return vec3(x, y, z);
}

function isRobotEntity(entity: BattleEntity): entity is RobotEntity {
  return entity.kind === 'robot';
}

function isProjectileEntity(entity: BattleEntity): entity is ProjectileEntity {
  return entity.kind === 'projectile';
}

function isEffectEntity(entity: BattleEntity): entity is EffectEntity {
  return entity.kind === 'effect';
}

function createEntityStore<T extends BattleEntity>(
  world: World<BattleEntity>,
  predicate: (entity: BattleEntity) => entity is T,
): Store<T> {
  return {
    get entities() {
      return Array.from(world.entities).filter(predicate) as T[];
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

export function createBattleWorld(): BattleWorld {
  const world = new World<BattleEntity>();
  const robots = createEntityStore(world, isRobotEntity);
  const projectiles = createEntityStore(world, isProjectileEntity);
  const effects = createEntityStore(world, isEffectEntity);

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

export function resetBattleWorld(world: BattleWorld): void {
  world.clear();
  world.state.elapsedMs = 0;
}

export function clonePosition(entity: RobotEntity): Vec3 {
  return cloneVec3(entity.position);
}

export function distanceToSpawnCenter(team: TeamId, position: Vec3): number {
  const center = TEAM_CONFIGS[team].spawnCenter;
  return Math.sqrt(distanceSquaredVec3(position, center));
}

export function getTeamConfig(team: TeamId): TeamConfig {
  return TEAM_CONFIGS[team];
}

export function translateFromSpawn(team: TeamId, offset: Vec3): Vec3 {
  const config = TEAM_CONFIGS[team];
  return addVec3(config.spawnCenter, offset);
}
