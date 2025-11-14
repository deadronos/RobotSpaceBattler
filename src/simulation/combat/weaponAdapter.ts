import type { WeaponType } from "../../lib/weapons/types";
import { weaponRegistry } from "../../lib/weapons/WeaponProfile";

export interface LegacyWeaponProfile {
  type: WeaponType;
  damage: number;
  fireRate: number;
  projectileSpeed: number;
  range: number;
}

export function getWeaponProfile(type: WeaponType): LegacyWeaponProfile {
  const profile = weaponRegistry.get(type);
  return {
    type,
    damage: profile.baseDamage,
    fireRate: profile.rateOfFire,
    range: profile.range,
    projectileSpeed: profile.projectileSpeed ?? 0,
  };
}

export function listWeaponTypes(): WeaponType[] {
  return weaponRegistry.listAll().map((profile) => profile.id as WeaponType);
}
