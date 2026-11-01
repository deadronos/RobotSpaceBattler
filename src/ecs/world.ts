import { World } from "miniplex";

import { cloneVec3, Vec3, vec3 } from "../lib/math/vec3";
import { generateTeamConfigs, TeamId } from "../lib/teamConfig";
import { qualityManager } from "../state/quality/QualityManager";
import {
  createVisualInstanceManager,
  VisualInstanceCategory,
} from "../visuals/VisualInstanceManager";
import { generateSeed } from "../lib/random/seed";
import { createEffectPool } from "./pools/EffectPool";
import { createProjectilePool } from "./pools/ProjectilePool";
import type {
  BattleEntity,
  BattleWorld,
  BattleWorldState,
  EffectEntity,
  ObstacleEntity,
  ProjectileEntity,
  RobotEntity,
  Store,
} from "./worldTypes";

export type { TeamId } from "../lib/teamConfig";
export type {
  BattleEntity,
  BattleWorld,
  BattleWorldState,
  EffectEntity,
  EffectType,
  EnemyMemoryEntry,
  ObstacleEntity,
  ProjectileEntity,
  RobotAIState,
  RobotEntity,
  Store,
  UnitRole,
  WeaponType,
} from "./worldTypes";

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
  return entity.kind === "robot";
}

function isProjectileEntity(entity: BattleEntity): entity is ProjectileEntity {
  return entity.kind === "projectile";
}

function isObstacleEntity(entity: BattleEntity): entity is ObstacleEntity {
  return entity.kind === "obstacle";
}

function isEffectEntity(entity: BattleEntity): entity is EffectEntity {
  return entity.kind === "effect";
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

function mapProjectileToCategory(
  projectile: ProjectileEntity,
): VisualInstanceCategory {
  if (projectile.weapon === "rocket") {
    return "rockets";
  }
  if (projectile.weapon === "laser") {
    return "lasers";
  }
  return "bullets";
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
    seed: generateSeed(),
    frameIndex: 0,
  };

  const instancingConfig = qualityManager.getInstancingConfig();
  const instanceManager = createVisualInstanceManager({
    maxInstances: instancingConfig.maxInstances,
  });

  const projectilePool = createProjectilePool(
    instancingConfig.maxInstances.bullets +
      instancingConfig.maxInstances.rockets,
  );
  const effectPool = createEffectPool(instancingConfig.maxInstances.effects);

  const battleWorld: BattleWorld = {
    world,
    robots,
    projectiles,
    effects,
    obstacles,
    teams: generateTeamConfigs(state.seed),
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
      const index = instanceManager.allocateIndex("effects", effect.id);
      effect.instanceIndex = index ?? undefined;
    },
    removeEffect: (effect: EffectEntity) => {
      instanceManager.releaseIndex("effects", effect.id);
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
  world.state.frameIndex = 0;
}

/**
 * Clones the position of a robot entity.
 * @param entity - The robot entity.
 * @returns A new Vec3 representing the robot's position.
 */
export function clonePosition(entity: RobotEntity): Vec3 {
  return cloneVec3(entity.position);
}
