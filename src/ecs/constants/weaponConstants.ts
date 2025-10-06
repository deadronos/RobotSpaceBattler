// Weapon constants and helper utilities
// NOTE: These values should be kept in sync with the human-readable
// scoring contract: specs/001-3d-team-vs/contracts/scoring-contract.md
// The contract documents the design decisions; this module is the
// runtime canonical source for code and tests.

import type { WeaponType } from '../../types';

export const BASE_DAMAGE: Record<WeaponType, number> = {
  laser: 15,
  gun: 20,
  rocket: 30,
};

export const MULTIPLIER_ADVANTAGE = 1.5;
export const MULTIPLIER_DISADVANTAGE = 0.67;
export const MULTIPLIER_NEUTRAL = 1.0;

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
 * Returns the damage multiplier for an attacker vs defender weapon matchup.
 * Using the MULTIPLIERS table guarantees consistent behavior across code
 * and tests.
 */
export function getDamageMultiplier(
  attackerWeapon: WeaponType,
  defenderWeapon: WeaponType
): number {
  return MULTIPLIERS[attackerWeapon][defenderWeapon] ?? MULTIPLIER_NEUTRAL;
}
