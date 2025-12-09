import type { WeaponType } from '../../../src/types';

// Canonical scoring contract exported as a TypeScript module so tests and
// runtime code can import and reuse the authoritative damage values and
// multipliers.

/**
 * Base damage values for each weapon type.
 */
export const BASE_DAMAGE: Record<WeaponType, number> = {
  laser: 15,
  gun: 20,
  rocket: 30,
};

export const MULTIPLIER_ADVANTAGE = 1.5;
export const MULTIPLIER_DISADVANTAGE = 0.67;
export const MULTIPLIER_NEUTRAL = 1.0;

/**
 * Damage multiplier matrix based on weapon types (Rock-Paper-Scissors).
 */
export const MULTIPLIERS: Record<WeaponType, Record<WeaponType, number>> = {
  laser: {
    laser: MULTIPLIER_NEUTRAL,
    gun: MULTIPLIER_ADVANTAGE,
    rocket: MULTIPLIER_DISADVANTAGE,
  },
  gun: {
    laser: MULTIPLIER_DISADVANTAGE,
    gun: MULTIPLIER_NEUTRAL,
    rocket: MULTIPLIER_ADVANTAGE,
  },
  rocket: {
    laser: MULTIPLIER_ADVANTAGE,
    gun: MULTIPLIER_DISADVANTAGE,
    rocket: MULTIPLIER_NEUTRAL,
  },
};

/**
 * Calculates the expected final damage for an attack.
 * @param attacker - The weapon type used by the attacker.
 * @param defender - The weapon type used by the defender.
 * @returns The final damage amount.
 */
export function expectedFinalDamage(attacker: WeaponType, defender: WeaponType): number {
  return BASE_DAMAGE[attacker] * MULTIPLIERS[attacker][defender];
}
