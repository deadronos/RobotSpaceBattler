/**
 * Contract Test: Weapon Balance
 *
 * Validates FR-003 (Weapon balance system) from scoring-contract.md
 * Tests the rock-paper-scissors damage multiplier system.
 * Tests MUST fail until weapon system is implemented.
 */

import { describe, it, expect } from 'vitest';
import type { WeaponType } from '../../src/types';
import {
  BASE_DAMAGE,
  getDamageMultiplier,
  MULTIPLIER_ADVANTAGE,
  MULTIPLIER_DISADVANTAGE,
  MULTIPLIER_NEUTRAL,
} from '../../src/ecs/constants/weaponConstants';

// Mock interface for weapon config that doesn't exist yet
interface WeaponConfig {
  type: WeaponType;
  baseDamage: number;
  fireRate: number;
  projectileSpeed: number;
  effectiveRange: number;
  visualEffect: string;
}

// Using getDamageMultiplier imported from the runtime constants module

// NOTE: Base damage values are canonicalized in
// `specs/001-3d-team-vs/contracts/scoring-contract.md`.
// Tests should not duplicate those numeric values here.
// These contract tests focus on multipliers and relative outcomes.

describe('Contract Test: Weapon Balance', () => {
  describe('Base Damage Values (runtime constants)', () => {
    it('should export base damage values for all weapon types', () => {
      const weapons: WeaponType[] = ['laser', 'gun', 'rocket'];
      weapons.forEach((w) => {
        expect(typeof BASE_DAMAGE[w]).toBe('number');
        expect(BASE_DAMAGE[w]).toBeGreaterThan(0);
      });
    });

    it('should compute final damage using the imported base damage', () => {
      // Demonstration: runtime code and tests share BASE_DAMAGE
      const multiplier = getDamageMultiplier('laser', 'gun');
      const finalDamage = BASE_DAMAGE.laser * multiplier;
      // We assert properties (positive, advantage > neutral) rather than
      // repeating hard-coded base damage literals in tests.
      expect(finalDamage).toBeGreaterThan(0);
      const neutralDamage = BASE_DAMAGE.laser * MULTIPLIER_NEUTRAL;
      expect(finalDamage).toBeGreaterThan(neutralDamage);
    });
  });

  describe('Advantage Matchups (1.5x multiplier)', () => {
    it('should apply 1.5x multiplier for Laser vs Gun (Laser wins)', () => {
      const multiplier = getDamageMultiplier('laser', 'gun');
      expect(multiplier).toBe(1.5);
    });

    it('should apply 1.5x multiplier for Gun vs Rocket (Gun wins)', () => {
      const multiplier = getDamageMultiplier('gun', 'rocket');
      expect(multiplier).toBe(1.5);
    });

    it('should apply 1.5x multiplier for Rocket vs Laser (Rocket wins)', () => {
      const multiplier = getDamageMultiplier('rocket', 'laser');
      expect(multiplier).toBe(1.5);
    });
  });

  describe('Disadvantage Matchups (0.67x multiplier)', () => {
    it('should apply 0.67x multiplier for Laser vs Rocket (Laser loses)', () => {
      const multiplier = getDamageMultiplier('laser', 'rocket');
      expect(multiplier).toBeCloseTo(0.67, 2);
    });

    it('should apply 0.67x multiplier for Gun vs Laser (Gun loses)', () => {
      const multiplier = getDamageMultiplier('gun', 'laser');
      expect(multiplier).toBeCloseTo(0.67, 2);
    });

    it('should apply 0.67x multiplier for Rocket vs Gun (Rocket loses)', () => {
      const multiplier = getDamageMultiplier('rocket', 'gun');
      expect(multiplier).toBeCloseTo(0.67, 2);
    });
  });

  describe('Neutral Matchups (1.0x multiplier)', () => {
    it('should apply 1.0x multiplier for Laser vs Laser', () => {
      const multiplier = getDamageMultiplier('laser', 'laser');
      expect(multiplier).toBe(1.0);
    });

    it('should apply 1.0x multiplier for Gun vs Gun', () => {
      const multiplier = getDamageMultiplier('gun', 'gun');
      expect(multiplier).toBe(1.0);
    });

    it('should apply 1.0x multiplier for Rocket vs Rocket', () => {
      const multiplier = getDamageMultiplier('rocket', 'rocket');
      expect(multiplier).toBe(1.0);
    });
  });

  describe('All 9 Matchup Matrix', () => {
    const matchups: Array<{
      attacker: WeaponType;
      defender: WeaponType;
      expectedMultiplier: number;
    }> = [
      { attacker: 'laser', defender: 'laser', expectedMultiplier: 1.0 },
      { attacker: 'laser', defender: 'gun', expectedMultiplier: 1.5 },
      { attacker: 'laser', defender: 'rocket', expectedMultiplier: 0.67 },
      { attacker: 'gun', defender: 'laser', expectedMultiplier: 0.67 },
      { attacker: 'gun', defender: 'gun', expectedMultiplier: 1.0 },
      { attacker: 'gun', defender: 'rocket', expectedMultiplier: 1.5 },
      { attacker: 'rocket', defender: 'laser', expectedMultiplier: 1.5 },
      { attacker: 'rocket', defender: 'gun', expectedMultiplier: 0.67 },
      { attacker: 'rocket', defender: 'rocket', expectedMultiplier: 1.0 },
    ];

    matchups.forEach(({ attacker, defender, expectedMultiplier }) => {
      it(`should return correct multiplier for ${attacker} vs ${defender}`, () => {
        const multiplier = getDamageMultiplier(attacker, defender);
        if (expectedMultiplier === 0.67) {
          expect(multiplier).toBeCloseTo(expectedMultiplier, 2);
        } else {
          expect(multiplier).toBe(expectedMultiplier);
        }
      });
    });
  });

  describe('Damage Floor Validation', () => {
    it('should never result in zero damage', () => {
      const weapons: WeaponType[] = ['laser', 'gun', 'rocket'];

      weapons.forEach((attacker) => {
        weapons.forEach((defender) => {
          const multiplier = getDamageMultiplier(attacker, defender);
          // Ensure multiplier is positive; base damage is defined in the
          // contract so a positive multiplier guarantees final damage > 0.
          expect(multiplier).toBeGreaterThan(0);
        });
      });
    });

    it('should never result in negative damage', () => {
      const weapons: WeaponType[] = ['laser', 'gun', 'rocket'];

      weapons.forEach((attacker) => {
        weapons.forEach((defender) => {
          const multiplier = getDamageMultiplier(attacker, defender);
          expect(multiplier).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Multiplier Validation', () => {
    it('should only use valid multipliers (1.5, 0.67, or 1.0)', () => {
      const weapons: WeaponType[] = ['laser', 'gun', 'rocket'];
      const validMultipliers = [1.5, 1.0, 0.67];

      weapons.forEach((attacker) => {
        weapons.forEach((defender) => {
          const multiplier = getDamageMultiplier(attacker, defender);
          const isValid = validMultipliers.some((valid) =>
            Math.abs(multiplier - valid) < 0.01
          );
          expect(isValid).toBe(true);
        });
      });
    });
  });
});
