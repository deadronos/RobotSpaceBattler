import type { WeaponType } from "../../types";

export interface WeaponConfig {
  type: WeaponType;
  baseDamage: number;
  fireRate: number;
  projectileSpeed: number;
  effectiveRange: number;
  visualEffect: "beam" | "tracer" | "exhaust";
}

const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  laser: {
    type: "laser",
    baseDamage: 15,
    fireRate: 0.5,
    projectileSpeed: 100,
    effectiveRange: 30,
    visualEffect: "beam",
  },
  gun: {
    type: "gun",
    baseDamage: 20,
    fireRate: 0.8,
    projectileSpeed: 75,
    effectiveRange: 40,
    visualEffect: "tracer",
  },
  rocket: {
    type: "rocket",
    baseDamage: 30,
    fireRate: 1.5,
    projectileSpeed: 50,
    effectiveRange: 50,
    visualEffect: "exhaust",
  },
};

const ADVANTAGE_MATRIX: Record<WeaponType, Record<WeaponType, number>> = {
  laser: {
    laser: 1,
    gun: 1.5,
    rocket: 0.67,
  },
  gun: {
    laser: 0.67,
    gun: 1,
    rocket: 1.5,
  },
  rocket: {
    laser: 1.5,
    gun: 0.67,
    rocket: 1,
  },
};

export function getWeaponConfig(type: WeaponType): WeaponConfig {
  return WEAPON_CONFIGS[type];
}

export function getDamageMultiplier(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  return ADVANTAGE_MATRIX[attacker][defender];
}

export function calculateWeaponDamage(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  const config = getWeaponConfig(attacker);
  const multiplier = getDamageMultiplier(attacker, defender);
  return config.baseDamage * multiplier;
}

export function getWeaponDistribution(): Record<WeaponType, WeaponConfig> {
  return { ...WEAPON_CONFIGS };
}
