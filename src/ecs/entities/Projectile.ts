import type { Vector3, WeaponType } from '../../types';

export interface Projectile {
  id: string;
  ownerId: string;
  weaponType: WeaponType;
  position: Vector3;
  velocity: Vector3;
  damage: number;
  distanceTraveled: number;
  maxDistance: number;
  spawnTime: number;
  maxLifetime: number;
}

export interface ProjectileInput extends Projectile {}

function clampPositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizeVector(vector: Vector3): Vector3 {
  return {
    x: Number.isFinite(vector.x) ? vector.x : 0,
    y: Number.isFinite(vector.y) ? vector.y : 0,
    z: Number.isFinite(vector.z) ? vector.z : 0,
  };
}

export function normalizeProjectile(input: ProjectileInput): Projectile {
  return {
    ...input,
    position: normalizeVector(input.position),
    velocity: normalizeVector(input.velocity),
    damage: clampPositive(input.damage, 1),
    distanceTraveled: Math.max(0, input.distanceTraveled),
    maxDistance: clampPositive(input.maxDistance, 1),
    maxLifetime: clampPositive(input.maxLifetime, 0.1),
    spawnTime: Math.max(0, input.spawnTime),
  };
}

export function createProjectile(input: ProjectileInput): Projectile {
  return normalizeProjectile(input);
}

export function shouldDespawn(projectile: Projectile, currentTime: number): boolean {
  if (projectile.distanceTraveled >= projectile.maxDistance) {
    return true;
  }

  return currentTime - projectile.spawnTime >= projectile.maxLifetime;
}
