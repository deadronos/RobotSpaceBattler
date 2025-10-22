import { WeaponType } from "../ecs/world";

export interface WeaponStats {
  name: string;
  range: number;
  damage: number;
  projectileSpeed: number;
  fireRate: number;
  color: string;
}

const weaponStats: Record<WeaponType, WeaponStats> = {
  laser: {
    name: "Laser",
    range: 28,
    damage: 8,
    projectileSpeed: 55,
    fireRate: 0.65,
    color: "#5dd2ff",
  },
  gun: {
    name: "Gun",
    range: 22,
    damage: 10,
    projectileSpeed: 36,
    fireRate: 0.85,
    color: "#ffd36d",
  },
  rocket: {
    name: "Rocket",
    range: 26,
    damage: 16,
    projectileSpeed: 24,
    fireRate: 1.45,
    color: "#ff6b7d",
  },
};

const advantageMap: Record<WeaponType, WeaponType> = {
  laser: "gun",
  gun: "rocket",
  rocket: "laser",
};

export function getWeaponStats(type: WeaponType): WeaponStats {
  return weaponStats[type];
}

export function getDamageMultiplier(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  if (advantageMap[attacker] === defender) {
    return 1.35;
  }

  if (advantageMap[defender] === attacker) {
    return 0.75;
  }

  return 1;
}
