/**
 * Archetype Multiplier Module
 * Task: T022
 * Spec: specs/005-weapon-diversity/spec.md (Rock-Paper-Scissors Balance)
 * 
 * Implements rock-paper-scissors damage multipliers:
 * - Laser > Gun (+25% damage)
 * - Gun > Rocket (+25% damage)
 * - Rocket > Laser (+25% damage)
 * - Reverse matchups: -15% damage
 * - Same archetype: neutral (1.0x)
 */

import {
  DEFAULT_BALANCE_MULTIPLIERS,
  getArchetypeAdvantage,
  WeaponArchetype,
} from '../../lib/weapons/types';

/**
 * Get the damage multiplier based on attacker and defender archetypes
 * 
 * Uses the rock-paper-scissors rules:
 * - Laser > Gun: 1.25x damage
 * - Gun > Rocket: 1.25x damage
 * - Rocket > Laser: 1.25x damage
 * - Reverse: 0.85x damage
 * - Same: 1.0x damage
 * 
 * @param attackerArchetype - Weapon archetype of the attacker
 * @param defenderArchetype - Weapon archetype of the defender
 * @returns Damage multiplier (1.25, 0.85, or 1.0)
 */
export function getArchetypeMultiplier(
  attackerArchetype: WeaponArchetype,
  defenderArchetype: WeaponArchetype
): number {
  const advantage = getArchetypeAdvantage(attackerArchetype, defenderArchetype);

  switch (advantage) {
    case 'advantage':
      return DEFAULT_BALANCE_MULTIPLIERS.advantageMultiplier;
    case 'disadvantage':
      return DEFAULT_BALANCE_MULTIPLIERS.disadvantageMultiplier;
    case 'neutral':
      return DEFAULT_BALANCE_MULTIPLIERS.neutralMultiplier;
  }
}
