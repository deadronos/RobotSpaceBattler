import { vec3 } from '../../lib/math/vec3';
import { ProjectileEntity } from '../world';

/**
 * Statistics for projectile pool usage.
 */
export interface ProjectilePoolStats {
  /** Number of new projectile objects created. */
  created: number;
  /** Number of times an existing projectile object was reused. */
  reused: number;
  /** Number of times a projectile object was released back to the pool. */
  released: number;
}

/**
 * Interface for the object pool managing projectile entities.
 * Helps reduce garbage collection overhead by reusing objects.
 */
export interface ProjectilePool {
  /** Gets a projectile entity from the pool (or creates a new one). */
  acquire: () => ProjectileEntity;
  /** Returns a projectile entity to the pool for reuse. */
  release: (projectile: ProjectileEntity) => void;
  /** Resets the pool and clears stats. */
  reset: () => void;
  /** Gets the number of free objects currently in the pool. */
  getFreeCount: () => number;
  /** Gets usage statistics. */
  getStats: () => ProjectilePoolStats;
}

/**
 * Creates an empty projectile entity with default values.
 * @returns A new ProjectileEntity.
 */
function createEmptyProjectile(): ProjectileEntity {
  return {
    id: '',
    kind: 'projectile',
    team: 'red',
    shooterId: '',
    weapon: 'gun',
    position: vec3(),
    velocity: vec3(),
    damage: 0,
    maxLifetime: 0,
    spawnTime: 0,
    distanceTraveled: 0,
    maxDistance: 0,
    speed: 0,
    instanceIndex: undefined,
  };
}

/**
 * Creates a pool for managing ProjectileEntity objects.
 *
 * @param initialSize - The initial number of objects to pre-allocate (default 64).
 * @returns A ProjectilePool instance.
 */
export function createProjectilePool(initialSize = 64): ProjectilePool {
  const free: ProjectileEntity[] = [];
  const stats: ProjectilePoolStats = {
    created: 0,
    reused: 0,
    released: 0,
  };

  const seed = Math.max(0, initialSize);
  for (let index = 0; index < seed; index += 1) {
    free.push(createEmptyProjectile());
  }

  function acquire(): ProjectileEntity {
    const projectile = free.pop();
    if (projectile) {
      stats.reused += 1;
      return projectile;
    }
    stats.created += 1;
    return createEmptyProjectile();
  }

  function release(projectile: ProjectileEntity): void {
    projectile.instanceIndex = undefined;
    projectile.id = '';
    projectile.team = 'red';
    projectile.shooterId = '';
    projectile.weapon = 'gun';
    projectile.targetId = undefined;
    projectile.projectileSize = undefined;
    projectile.projectileColor = undefined;
    projectile.trailColor = undefined;
    projectile.aoeRadius = undefined;
    projectile.explosionDurationMs = undefined;
    projectile.beamWidth = undefined;
    projectile.impactDurationMs = undefined;
    projectile.position = vec3();
    projectile.velocity = vec3();
    projectile.distanceTraveled = 0;
    projectile.spawnTime = 0;
    projectile.maxLifetime = 0;
    projectile.maxDistance = 0;
    projectile.speed = 0;
    projectile.damage = 0;
    stats.released += 1;
    free.push(projectile);
  }

  function reset(): void {
    free.splice(0, free.length);
    stats.created = 0;
    stats.reused = 0;
    stats.released = 0;
    for (let index = 0; index < seed; index += 1) {
      free.push(createEmptyProjectile());
    }
  }

  return {
    acquire,
    release,
    reset,
    getFreeCount: () => free.length,
    getStats: () => ({ ...stats }),
  };
}
