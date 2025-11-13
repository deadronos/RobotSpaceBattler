/**
 * Damage Pipeline with Archetype Multiplier Integration and Telemetry
 * Task: T020, T023
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
 *
 * Telemetry instrumentation (T020):
 * - Emits weapon-fired, weapon-hit, explosion-aoe, weapon-damage events
 */

import type {
  WeaponArchetype,
} from "../../lib/weapons/types";
import { globalTelemetryAggregator } from "../../telemetry/aggregator";
import { getArchetypeMultiplier } from "../balance/archetypeMultiplier";

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
    defenderArchetype,
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

/**
 * Telemetry context for damage events
 */
export interface DamageTelemetryContext {
  matchId: string;
  weaponProfileId: string;
  attackerId: string;
  targetId: string;
  timestampMs: number;
  archetype: WeaponArchetype;
  isAoE?: boolean;
  aoeRadius?: number;
  frameIndex?: number;
}

/**
 * Record weapon-fired event
 */
export function recordWeaponFired(context: DamageTelemetryContext): void {
  globalTelemetryAggregator.record({
    type: "weapon-fired",
    matchId: context.matchId,
    weaponProfileId: context.weaponProfileId,
    attackerId: context.attackerId,
    targetId: context.targetId,
    timestampMs: context.timestampMs,
    archetype: context.archetype,
  });
}

/**
 * Record weapon-hit event
 */
export function recordWeaponHit(context: DamageTelemetryContext): void {
  globalTelemetryAggregator.record({
    type: "weapon-hit",
    matchId: context.matchId,
    weaponProfileId: context.weaponProfileId,
    attackerId: context.attackerId,
    targetId: context.targetId,
    timestampMs: context.timestampMs,
    archetype: context.archetype,
  });
}

/**
 * Record explosion-aoe event
 */
export function recordExplosionAoE(context: DamageTelemetryContext): void {
  globalTelemetryAggregator.record({
    type: "explosion-aoe",
    matchId: context.matchId,
    weaponProfileId: context.weaponProfileId,
    attackerId: context.attackerId,
    timestampMs: context.timestampMs,
    archetype: context.archetype,
    isAoE: true,
    aoeRadius: context.aoeRadius,
  });
}

/**
 * Record weapon-damage event
 */
export function recordWeaponDamage(
  context: DamageTelemetryContext,
  amount: number,
): void {
  globalTelemetryAggregator.record({
    type: "weapon-damage",
    matchId: context.matchId,
    weaponProfileId: context.weaponProfileId,
    attackerId: context.attackerId,
    targetId: context.targetId,
    amount,
    timestampMs: context.timestampMs,
    frameIndex: context.frameIndex,
    archetype: context.archetype,
    isAoE: context.isAoE,
  });
}
