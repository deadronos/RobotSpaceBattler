import { WeaponType } from '../../ecs/world';

export interface WeaponProfile {
  type: WeaponType;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  range: number;
  projectileSize: number;
  projectileColor: string;
  trailColor?: string;
  aoeRadius?: number;
  explosionDurationMs?: number;
  beamWidth?: number;
  impactDurationMs?: number;
}

const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
  laser: {
    type: 'laser',
    damage: 14,
    fireRate: 1.8,
    projectileSpeed: 32,
    range: 28,
    projectileSize: 0.18,
    projectileColor: '#7fffd4',
    beamWidth: 0.08,
    impactDurationMs: 280,
  },
  gun: {
    type: 'gun',
    damage: 16,
    fireRate: 1.4,
    projectileSpeed: 26,
    range: 24,
    projectileSize: 0.14,
    projectileColor: '#ffe08a',
    impactDurationMs: 220,
  },
  rocket: {
    type: 'rocket',
    damage: 24,
    fireRate: 0.9,
    projectileSpeed: 22,
    range: 34,
    projectileSize: 0.32,
    projectileColor: '#ff9d5c',
    trailColor: '#ffbe76',
    aoeRadius: 2.5,
    explosionDurationMs: 720,
    impactDurationMs: 360,
  },
};

const DAMAGE_MATRIX: Record<WeaponType, Record<WeaponType, number>> = {
  laser: {
    laser: 1,
    gun: 1.25,
    rocket: 0.85,
  },
  gun: {
    laser: 0.85,
    gun: 1,
    rocket: 1.25,
  },
  rocket: {
    laser: 1.25,
    gun: 0.85,
    rocket: 1,
  },
};

export function getWeaponProfile(type: WeaponType): WeaponProfile {
  return WEAPON_PROFILES[type];
}

export function computeDamageMultiplier(attacker: WeaponType, defender: WeaponType): number {
  return DAMAGE_MATRIX[attacker][defender];
}

export function computeProjectileLifetime(profile: WeaponProfile): number {
  return profile.range / profile.projectileSpeed;
}
