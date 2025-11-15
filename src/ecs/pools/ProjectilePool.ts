import { vec3 } from '../../lib/math/vec3';
import { ProjectileEntity } from '../world';

export interface ProjectilePoolStats {
  created: number;
  reused: number;
  released: number;
}

export interface ProjectilePool {
  acquire: () => ProjectileEntity;
  release: (projectile: ProjectileEntity) => void;
  reset: () => void;
  getFreeCount: () => number;
  getStats: () => ProjectilePoolStats;
}

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
