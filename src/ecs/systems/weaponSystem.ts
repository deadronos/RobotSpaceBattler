import type { WeaponType } from '../../types';
import { calculateWeaponDamage, getDamageMultiplier, getWeaponConfig } from '../entities/Weapon';

export { getDamageMultiplier };

export function getWeaponData(weapon: WeaponType) {
  return getWeaponConfig(weapon);
}

export function calculateDamage(attacker: WeaponType, defender: WeaponType): number {
  return calculateWeaponDamage(attacker, defender);
}
