/**
 * Damage Pipeline with Archetype Multiplier Integration
 * Task: T023
 * Spec: specs/005-weapon-diversity/spec.md (Damage Calculation)
 * 
 * Implements the damage calculation pipeline:
 * finalDamage = baseDamage * archetypeMultiplier * otherModifiers * resistanceMultiplier
 * 
 * Pipeline order:
 * 1. Base damage
 * 2. Archetype multiplier (RPS)
 * 3. Other damage modifiers (buffs, debuffs)
 * 4. Resistances (applied last)
 */

import { getArchetypeMultiplier } from '../balance/archetypeMultiplier';
import type { WeaponArchetype } from '../../lib/weapons/types';

/**
 * Damage calculation input parameters
 */
export interface DamageInput {
  baseDamage: number;
  attackerArchetype: WeaponArchetype;
  defenderArchetype: WeaponArchetype;
  damageModifier?: number; // Multiplicative damage boost/reduction (default: 1.0)
  resistanceMultiplier?: number; // Defensive multiplier (default: 1.0)
}

/**
 * Damage calculation output with breakdown
 */
export interface DamageOutput {
  baseDamage: number;
  archetypeMultiplier: number;
  damageModifier: number;
  resistanceMultiplier: number;
  finalDamage: number;
}

/**
 * Calculate final damage with archetype multiplier integration
 * 
 * Formula: finalDamage = baseDamage * archetypeMultiplier * damageModifier * resistanceMultiplier
 * 
 * @param input - Damage calculation parameters
 * @returns Damage output with full breakdown
 */
export function calculateDamage(input: DamageInput): DamageOutput {
  const {
    baseDamage,
    attackerArchetype,
    defenderArchetype,
    damageModifier = 1.0,
    resistanceMultiplier = 1.0,
  } = input;

  // Get archetype multiplier from RPS rules
  const archetypeMultiplier = getArchetypeMultiplier(
    attackerArchetype,
    defenderArchetype
  );

  // Calculate final damage with proper order:
  // 1. Apply archetype multiplier to base damage
  // 2. Apply other damage modifiers
  // 3. Apply resistances last
  const finalDamage =
    baseDamage * archetypeMultiplier * damageModifier * resistanceMultiplier;

  return {
    baseDamage,
    archetypeMultiplier,
    damageModifier,
    resistanceMultiplier,
    finalDamage,
  };
}
