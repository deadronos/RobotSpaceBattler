import { describe, expect, it } from 'vitest';
import {
  WeaponProfile,
  computeDamageMultiplier,
  computeProjectileLifetime,
  getWeaponProfile,
} from '@/simulation/combat/weapons';
import { WeaponType } from '@/ecs/worldTypes';

describe('Combat System - Weapons', () => {
  describe('getWeaponProfile', () => {
    it('returns a valid profile for all weapon types', () => {
      const types: WeaponType[] = ['laser', 'gun', 'rocket'];

      types.forEach((type) => {
        const profile = getWeaponProfile(type);
        expect(profile).toBeDefined();
        expect(profile.type).toBe(type);
        expect(profile.damage).toBeGreaterThan(0);
        expect(profile.range).toBeGreaterThan(0);
        expect(profile.projectileSpeed).toBeGreaterThan(0);
      });
    });
  });

  describe('computeDamageMultiplier', () => {
    // Rock-Paper-Scissors: Laser > Gun > Rocket > Laser

    it('calculates correct multipliers for Laser', () => {
      expect(computeDamageMultiplier('laser', 'laser')).toBe(1);
      expect(computeDamageMultiplier('laser', 'gun')).toBe(1.25); // Strong vs Gun
      expect(computeDamageMultiplier('laser', 'rocket')).toBe(0.85); // Weak vs Rocket
    });

    it('calculates correct multipliers for Gun', () => {
      expect(computeDamageMultiplier('gun', 'gun')).toBe(1);
      expect(computeDamageMultiplier('gun', 'rocket')).toBe(1.25); // Strong vs Rocket
      expect(computeDamageMultiplier('gun', 'laser')).toBe(0.85); // Weak vs Laser
    });

    it('calculates correct multipliers for Rocket', () => {
      expect(computeDamageMultiplier('rocket', 'rocket')).toBe(1);
      expect(computeDamageMultiplier('rocket', 'laser')).toBe(1.25); // Strong vs Laser
      expect(computeDamageMultiplier('rocket', 'gun')).toBe(0.85); // Weak vs Gun
    });
  });

  describe('computeProjectileLifetime', () => {
    it('calculates lifetime based on range and speed', () => {
      const mockProfile = {
        range: 100,
        projectileSpeed: 20,
      } as WeaponProfile;

      const lifetime = computeProjectileLifetime(mockProfile);
      expect(lifetime).toBe(5); // 100 / 20 = 5 seconds
    });

    it('handles high speed projectiles', () => {
      const mockProfile = {
        range: 100,
        projectileSpeed: 1000,
      } as WeaponProfile;

      const lifetime = computeProjectileLifetime(mockProfile);
      expect(lifetime).toBe(0.1);
    });
  });
});
