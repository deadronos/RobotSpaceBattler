/**
 * Unit tests for archetype multiplier module
 * Task: T022
 * Spec: specs/005-weapon-diversity/spec.md (Rock-Paper-Scissors Balance)
 */

import { describe, it, expect } from 'vitest';
import { getArchetypeMultiplier } from '../../src/simulation/balance/archetypeMultiplier';
import { DEFAULT_BALANCE_MULTIPLIERS } from '../../src/lib/weapons/types';

describe('archetypeMultiplier', () => {
  describe('getArchetypeMultiplier', () => {
    it('should return advantage multiplier (1.25) when laser attacks gun', () => {
      const result = getArchetypeMultiplier('laser', 'gun');
      expect(result).toBe(DEFAULT_BALANCE_MULTIPLIERS.advantageMultiplier);
      expect(result).toBe(1.25);
    });

    it('should return advantage multiplier (1.25) when gun attacks rocket', () => {
      const result = getArchetypeMultiplier('gun', 'rocket');
      expect(result).toBe(DEFAULT_BALANCE_MULTIPLIERS.advantageMultiplier);
      expect(result).toBe(1.25);
    });

    it('should return advantage multiplier (1.25) when rocket attacks laser', () => {
      const result = getArchetypeMultiplier('rocket', 'laser');
      expect(result).toBe(DEFAULT_BALANCE_MULTIPLIERS.advantageMultiplier);
      expect(result).toBe(1.25);
    });

    it('should return disadvantage multiplier (0.85) when gun attacks laser', () => {
      const result = getArchetypeMultiplier('gun', 'laser');
      expect(result).toBe(DEFAULT_BALANCE_MULTIPLIERS.disadvantageMultiplier);
      expect(result).toBe(0.85);
    });

    it('should return disadvantage multiplier (0.85) when rocket attacks gun', () => {
      const result = getArchetypeMultiplier('rocket', 'gun');
      expect(result).toBe(DEFAULT_BALANCE_MULTIPLIERS.disadvantageMultiplier);
      expect(result).toBe(0.85);
    });

    it('should return disadvantage multiplier (0.85) when laser attacks rocket', () => {
      const result = getArchetypeMultiplier('laser', 'rocket');
      expect(result).toBe(DEFAULT_BALANCE_MULTIPLIERS.disadvantageMultiplier);
      expect(result).toBe(0.85);
    });

    it('should return neutral multiplier (1.0) for same archetype matchups', () => {
      expect(getArchetypeMultiplier('gun', 'gun')).toBe(1.0);
      expect(getArchetypeMultiplier('laser', 'laser')).toBe(1.0);
      expect(getArchetypeMultiplier('rocket', 'rocket')).toBe(1.0);
    });

    it('should use DEFAULT_BALANCE_MULTIPLIERS for all values', () => {
      // Verify that the multipliers come from the correct source
      const advantage = getArchetypeMultiplier('laser', 'gun');
      const disadvantage = getArchetypeMultiplier('gun', 'laser');
      const neutral = getArchetypeMultiplier('gun', 'gun');

      expect(advantage).toBe(DEFAULT_BALANCE_MULTIPLIERS.advantageMultiplier);
      expect(disadvantage).toBe(DEFAULT_BALANCE_MULTIPLIERS.disadvantageMultiplier);
      expect(neutral).toBe(DEFAULT_BALANCE_MULTIPLIERS.neutralMultiplier);
    });

    it('should cover all rock-paper-scissors combinations', () => {
      // Complete coverage matrix
      const combinations = [
        // Advantage cases
        { attacker: 'laser', defender: 'gun', expected: 1.25 },
        { attacker: 'gun', defender: 'rocket', expected: 1.25 },
        { attacker: 'rocket', defender: 'laser', expected: 1.25 },
        // Disadvantage cases
        { attacker: 'gun', defender: 'laser', expected: 0.85 },
        { attacker: 'rocket', defender: 'gun', expected: 0.85 },
        { attacker: 'laser', defender: 'rocket', expected: 0.85 },
        // Neutral cases
        { attacker: 'gun', defender: 'gun', expected: 1.0 },
        { attacker: 'laser', defender: 'laser', expected: 1.0 },
        { attacker: 'rocket', defender: 'rocket', expected: 1.0 },
      ] as const;

      combinations.forEach(({ attacker, defender, expected }) => {
        const result = getArchetypeMultiplier(attacker, defender);
        expect(result).toBe(expected);
      });
    });
  });
});
