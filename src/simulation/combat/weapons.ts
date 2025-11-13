import { WeaponType } from "../../ecs/world";

export interface WeaponProfile {
  type: WeaponType;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  range: number;
}

const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
  laser: {
    type: "laser",
    damage: 14,
    fireRate: 1.8,
    projectileSpeed: 32,
    range: 28,
  },
  gun: {
    type: "gun",
    damage: 16,
    fireRate: 1.4,
    projectileSpeed: 26,
    range: 24,
  },
  rocket: {
    type: "rocket",
    damage: 24,
    fireRate: 0.9,
    projectileSpeed: 22,
    range: 34,
  },
};

const DAMAGE_MATRIX: Record<WeaponType, Record<WeaponType, number>> = {
  laser: {
    laser: 1,
    gun: 1.35,
    rocket: 0.75,
  },
  gun: {
    laser: 0.75,
    gun: 1,
    rocket: 1.35,
  },
  rocket: {
    laser: 1.35,
    gun: 0.75,
    rocket: 1,
  },
};

export function getWeaponProfile(type: WeaponType): WeaponProfile {
  return WEAPON_PROFILES[type];
}

export function computeDamageMultiplier(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  return DAMAGE_MATRIX[attacker][defender];
}

export function computeProjectileLifetime(profile: WeaponProfile): number {
  return profile.range / profile.projectileSpeed;
}
