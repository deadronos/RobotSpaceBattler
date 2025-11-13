/**
 * Unit tests for damage pipeline with archetype multiplier integration
 * Task: T023
 * Spec: specs/005-weapon-diversity/spec.md (Damage Calculation)
 */

import { describe, it, expect } from 'vitest';
import { calculateDamage } from '../../src/simulation/damage/damagePipeline';
import type { WeaponArchetype } from '../../src/lib/weapons/types';

describe('damagePipeline', () => {
  describe('calculateDamage', () => {
    it('should calculate base damage with neutral multiplier (same archetype)', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'gun',
        defenderArchetype: 'gun',
      });

      expect(result.finalDamage).toBe(100);
      expect(result.archetypeMultiplier).toBe(1.0);
    });

    it('should apply advantage multiplier (1.25x) when laser attacks gun', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'laser',
        defenderArchetype: 'gun',
      });

      expect(result.finalDamage).toBe(125);
      expect(result.archetypeMultiplier).toBe(1.25);
    });

    it('should apply advantage multiplier (1.25x) when gun attacks rocket', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'gun',
        defenderArchetype: 'rocket',
      });

      expect(result.finalDamage).toBe(125);
      expect(result.archetypeMultiplier).toBe(1.25);
    });

    it('should apply advantage multiplier (1.25x) when rocket attacks laser', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'rocket',
        defenderArchetype: 'laser',
      });

      expect(result.finalDamage).toBe(125);
      expect(result.archetypeMultiplier).toBe(1.25);
    });

    it('should apply disadvantage multiplier (0.85x) when gun attacks laser', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'gun',
        defenderArchetype: 'laser',
      });

      expect(result.finalDamage).toBe(85);
      expect(result.archetypeMultiplier).toBe(0.85);
    });

    it('should apply disadvantage multiplier (0.85x) when rocket attacks gun', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'rocket',
        defenderArchetype: 'gun',
      });

      expect(result.finalDamage).toBe(85);
      expect(result.archetypeMultiplier).toBe(0.85);
    });

    it('should apply disadvantage multiplier (0.85x) when laser attacks rocket', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'laser',
        defenderArchetype: 'rocket',
      });

      expect(result.finalDamage).toBe(85);
      expect(result.archetypeMultiplier).toBe(0.85);
    });

    it('should apply archetype multiplier before resistances', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'laser',
        defenderArchetype: 'gun',
        resistanceMultiplier: 0.8, // 20% resistance
      });

      // (100 * 1.25) * 0.8 = 100
      expect(result.finalDamage).toBe(100);
      expect(result.archetypeMultiplier).toBe(1.25);
      expect(result.resistanceMultiplier).toBe(0.8);
    });

    it('should handle multiple modifiers in correct order', () => {
      const result = calculateDamage({
        baseDamage: 100,
        attackerArchetype: 'gun',
        defenderArchetype: 'rocket',
        damageModifier: 1.5, // +50% damage boost
        resistanceMultiplier: 0.9, // 10% resistance
      });

      // (100 * 1.25 * 1.5) * 0.9 = 168.75
      expect(result.finalDamage).toBe(168.75);
      expect(result.archetypeMultiplier).toBe(1.25);
    });

    it('should return breakdown of all multipliers', () => {
      const result = calculateDamage({
        baseDamage: 200,
        attackerArchetype: 'rocket',
        defenderArchetype: 'laser',
        damageModifier: 2.0,
        resistanceMultiplier: 0.5,
      });

      // (200 * 1.25 * 2.0) * 0.5 = 250
      expect(result).toEqual({
        baseDamage: 200,
        archetypeMultiplier: 1.25,
        damageModifier: 2.0,
        resistanceMultiplier: 0.5,
        finalDamage: 250,
      });
    });

    it('should use default multipliers when not provided', () => {
      const result = calculateDamage({
        baseDamage: 50,
        attackerArchetype: 'laser',
        defenderArchetype: 'laser',
      });

      expect(result.damageModifier).toBe(1.0);
      expect(result.resistanceMultiplier).toBe(1.0);
      expect(result.finalDamage).toBe(50);
    });

    it('should handle fractional base damage', () => {
      const result = calculateDamage({
        baseDamage: 33.33,
        attackerArchetype: 'laser',
        defenderArchetype: 'gun',
      });

      expect(result.finalDamage).toBeCloseTo(41.6625, 4);
    });

    it('should calculate correct damage for all RPS combinations', () => {
      const testCases: Array<{
        attacker: WeaponArchetype;
        defender: WeaponArchetype;
        expectedMultiplier: number;
      }> = [
        // Advantages
        { attacker: 'laser', defender: 'gun', expectedMultiplier: 1.25 },
        { attacker: 'gun', defender: 'rocket', expectedMultiplier: 1.25 },
        { attacker: 'rocket', defender: 'laser', expectedMultiplier: 1.25 },
        // Disadvantages
        { attacker: 'gun', defender: 'laser', expectedMultiplier: 0.85 },
        { attacker: 'rocket', defender: 'gun', expectedMultiplier: 0.85 },
        { attacker: 'laser', defender: 'rocket', expectedMultiplier: 0.85 },
        // Neutral
        { attacker: 'gun', defender: 'gun', expectedMultiplier: 1.0 },
        { attacker: 'laser', defender: 'laser', expectedMultiplier: 1.0 },
        { attacker: 'rocket', defender: 'rocket', expectedMultiplier: 1.0 },
      ];

      testCases.forEach(({ attacker, defender, expectedMultiplier }) => {
        const result = calculateDamage({
          baseDamage: 100,
          attackerArchetype: attacker,
          defenderArchetype: defender,
        });

        expect(result.archetypeMultiplier).toBe(expectedMultiplier);
        expect(result.finalDamage).toBe(100 * expectedMultiplier);
      });
    });
  });
});
