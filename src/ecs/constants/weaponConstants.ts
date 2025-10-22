// Weapon constants and helper utilities
// NOTE: These values are canonicalized in the scoring contract module and re-exported
// via src/contracts/loadScoringContract.ts so runtime code and tests share the same
// authoritative values.

import {
  MULTIPLIER_NEUTRAL,
  MULTIPLIERS,
} from "../../contracts/loadScoringContract";
import type { WeaponType } from "../../types";
export {
  BASE_DAMAGE,
  MULTIPLIER_ADVANTAGE,
  MULTIPLIER_DISADVANTAGE,
  MULTIPLIER_NEUTRAL,
} from "../../contracts/loadScoringContract";

/**
 * Returns the damage multiplier for an attacker vs defender weapon matchup.
 * Using the MULTIPLIERS table guarantees consistent behavior across code
 * and tests.
 */
export function getDamageMultiplier(
  attackerWeapon: WeaponType,
  defenderWeapon: WeaponType,
): number {
  return MULTIPLIERS[attackerWeapon][defenderWeapon] ?? MULTIPLIER_NEUTRAL;
}
