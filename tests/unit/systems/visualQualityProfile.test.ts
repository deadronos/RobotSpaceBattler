/**
 * visualQualityProfile Unit Tests (T033, US2)
 *
 * Tests for visual quality profile factory, helpers, and validation functions.
 * Ensures quality profiles are created correctly per level and provide consistent settings.
 */

import { describe, expect, it } from 'vitest';

import { VisualQualityLevel } from '../../../src/systems/matchTrace/types';
import {
  createQualityProfile,
  DEFAULT_QUALITY_LEVEL,
  DEFAULT_QUALITY_PROFILE,
  getParticleIntensity,
  getShadowMapSize,
  getTextureScale,
  getTrailComplexity,
  isFeatureEnabled,
  isValidQualityLevel,
} from '../../../src/systems/matchTrace/visualQualityProfile';

// ============================================================================
// Test Suite: Visual Quality Profile System
// ============================================================================

describe('visualQualityProfile', () => {
  // ========================================================================
  // createQualityProfile Factory Tests
  // ========================================================================

  describe('createQualityProfile()', () => {
    it('should create a HIGH quality profile with all features enabled', () => {
      const profile = createQualityProfile(VisualQualityLevel.High);

      expect(profile.level).toBe(VisualQualityLevel.High);
      expect(profile.shadowsEnabled).toBe(true);
      expect(profile.texturesEnabled).toBe(true);
      expect(profile.particlesEnabled).toBe(true);
      expect(profile.postProcessingEnabled).toBe(true);
      expect(profile.maxLights).toBe(8);
    });

    it('should create a MEDIUM quality profile with balanced features', () => {
      const profile = createQualityProfile(VisualQualityLevel.Medium);

      expect(profile.level).toBe(VisualQualityLevel.Medium);
      expect(profile.shadowsEnabled).toBe(true);
      expect(profile.texturesEnabled).toBe(true);
      expect(profile.particlesEnabled).toBe(true);
      expect(profile.postProcessingEnabled).toBe(false); // Disabled at medium
      expect(profile.maxLights).toBe(4);
    });

    it('should create a LOW quality profile with minimal features', () => {
      const profile = createQualityProfile(VisualQualityLevel.Low);

      expect(profile.level).toBe(VisualQualityLevel.Low);
      expect(profile.shadowsEnabled).toBe(false);
      expect(profile.texturesEnabled).toBe(false);
      expect(profile.particlesEnabled).toBe(false);
      expect(profile.postProcessingEnabled).toBe(false);
      expect(profile.maxLights).toBe(2);
    });

    it('should return consistent profiles for same level', () => {
      const profile1 = createQualityProfile(VisualQualityLevel.Medium);
      const profile2 = createQualityProfile(VisualQualityLevel.Medium);

      expect(profile1).toEqual(profile2);
    });
  });

  // ========================================================================
  // Helper Function Tests: getParticleIntensity
  // ========================================================================

  describe('getParticleIntensity()', () => {
    it('should return 1.0 for HIGH quality', () => {
      const intensity = getParticleIntensity(VisualQualityLevel.High);
      expect(intensity).toBe(1.0);
    });

    it('should return 0.5 for MEDIUM quality', () => {
      const intensity = getParticleIntensity(VisualQualityLevel.Medium);
      expect(intensity).toBe(0.5);
    });

    it('should return 0 for LOW quality', () => {
      const intensity = getParticleIntensity(VisualQualityLevel.Low);
      expect(intensity).toBe(0);
    });

    it('should return multiplier in valid range [0, 1]', () => {
      const levels = [VisualQualityLevel.High, VisualQualityLevel.Medium, VisualQualityLevel.Low];

      levels.forEach((level) => {
        const intensity = getParticleIntensity(level);
        expect(intensity).toBeGreaterThanOrEqual(0);
        expect(intensity).toBeLessThanOrEqual(1);
      });
    });
  });

  // ========================================================================
  // Helper Function Tests: getShadowMapSize
  // ========================================================================

  describe('getShadowMapSize()', () => {
    it('should return 2048 for HIGH quality', () => {
      const size = getShadowMapSize(VisualQualityLevel.High);
      expect(size).toBe(2048);
    });

    it('should return 1024 for MEDIUM quality', () => {
      const size = getShadowMapSize(VisualQualityLevel.Medium);
      expect(size).toBe(1024);
    });

    it('should return 512 for LOW quality', () => {
      const size = getShadowMapSize(VisualQualityLevel.Low);
      expect(size).toBe(512);
    });

    it('should return power-of-2 shadow map sizes', () => {
      const levels = [VisualQualityLevel.High, VisualQualityLevel.Medium, VisualQualityLevel.Low];
      const validSizes = [512, 1024, 2048];

      levels.forEach((level) => {
        const size = getShadowMapSize(level);
        expect(validSizes).toContain(size);
      });
    });
  });

  // ========================================================================
  // Helper Function Tests: getTextureScale
  // ========================================================================

  describe('getTextureScale()', () => {
    it('should return 1.0 for HIGH quality', () => {
      const scale = getTextureScale(VisualQualityLevel.High);
      expect(scale).toBe(1.0);
    });

    it('should return 0.75 for MEDIUM quality', () => {
      const scale = getTextureScale(VisualQualityLevel.Medium);
      expect(scale).toBe(0.75);
    });

    it('should return 0 for LOW quality (disabled)', () => {
      const scale = getTextureScale(VisualQualityLevel.Low);
      expect(scale).toBe(0);
    });

    it('should return scale in valid range [0, 1]', () => {
      const levels = [VisualQualityLevel.High, VisualQualityLevel.Medium, VisualQualityLevel.Low];

      levels.forEach((level) => {
        const scale = getTextureScale(level);
        expect(scale).toBeGreaterThanOrEqual(0);
        expect(scale).toBeLessThanOrEqual(1);
      });
    });
  });

  // ========================================================================
  // Helper Function Tests: getTrailComplexity
  // ========================================================================

  describe('getTrailComplexity()', () => {
    it('should return 32 segments for HIGH quality', () => {
      const complexity = getTrailComplexity(VisualQualityLevel.High);
      expect(complexity).toBe(32);
    });

    it('should return 16 segments for MEDIUM quality', () => {
      const complexity = getTrailComplexity(VisualQualityLevel.Medium);
      expect(complexity).toBe(16);
    });

    it('should return 4 segments for LOW quality', () => {
      const complexity = getTrailComplexity(VisualQualityLevel.Low);
      expect(complexity).toBe(4);
    });

    it('should return positive segment counts', () => {
      const levels = [VisualQualityLevel.High, VisualQualityLevel.Medium, VisualQualityLevel.Low];

      levels.forEach((level) => {
        const complexity = getTrailComplexity(level);
        expect(complexity).toBeGreaterThan(0);
      });
    });
  });

  // ========================================================================
  // Feature Enablement Tests: isFeatureEnabled
  // ========================================================================

  describe('isFeatureEnabled()', () => {
    it('should enable all features in HIGH quality profile', () => {
      const profile = createQualityProfile(VisualQualityLevel.High);

      expect(isFeatureEnabled(profile, 'shadows')).toBe(true);
      expect(isFeatureEnabled(profile, 'textures')).toBe(true);
      expect(isFeatureEnabled(profile, 'particles')).toBe(true);
      expect(isFeatureEnabled(profile, 'postProcessing')).toBe(true);
    });

    it('should disable post-processing in MEDIUM quality profile', () => {
      const profile = createQualityProfile(VisualQualityLevel.Medium);

      expect(isFeatureEnabled(profile, 'shadows')).toBe(true);
      expect(isFeatureEnabled(profile, 'textures')).toBe(true);
      expect(isFeatureEnabled(profile, 'particles')).toBe(true);
      expect(isFeatureEnabled(profile, 'postProcessing')).toBe(false);
    });

    it('should disable all non-essential features in LOW quality profile', () => {
      const profile = createQualityProfile(VisualQualityLevel.Low);

      expect(isFeatureEnabled(profile, 'shadows')).toBe(false);
      expect(isFeatureEnabled(profile, 'textures')).toBe(false);
      expect(isFeatureEnabled(profile, 'particles')).toBe(false);
      expect(isFeatureEnabled(profile, 'postProcessing')).toBe(false);
    });

    it('should handle invalid feature names gracefully', () => {
      const profile = createQualityProfile(VisualQualityLevel.High);

      // Should not throw and return false for unknown features
      expect(() => isFeatureEnabled(profile, 'unknownFeature' as any)).not.toThrow();
    });
  });

  // ========================================================================
  // Validation Tests: isValidQualityLevel
  // ========================================================================

  describe('isValidQualityLevel()', () => {
    it('should validate HIGH quality level', () => {
      expect(isValidQualityLevel(VisualQualityLevel.High)).toBe(true);
      expect(isValidQualityLevel('high')).toBe(true);
    });

    it('should validate MEDIUM quality level', () => {
      expect(isValidQualityLevel(VisualQualityLevel.Medium)).toBe(true);
      expect(isValidQualityLevel('medium')).toBe(true);
    });

    it('should validate LOW quality level', () => {
      expect(isValidQualityLevel(VisualQualityLevel.Low)).toBe(true);
      expect(isValidQualityLevel('low')).toBe(true);
    });

    it('should reject invalid quality levels', () => {
      expect(isValidQualityLevel('ultra')).toBe(false);
      expect(isValidQualityLevel('extreme')).toBe(false);
      expect(isValidQualityLevel('')).toBe(false);
      expect(isValidQualityLevel(null as any)).toBe(false);
      expect(isValidQualityLevel(undefined as any)).toBe(false);
      expect(isValidQualityLevel(123 as any)).toBe(false);
    });

    it('should act as a type guard for discriminated unions', () => {
      const unknownLevel: any = 'medium';

      if (isValidQualityLevel(unknownLevel)) {
        // Type should be narrowed to VisualQualityLevel
        const profile = createQualityProfile(unknownLevel);
        expect(profile.level).toBeDefined();
      }
    });
  });

  // ========================================================================
  // Default Constants Tests
  // ========================================================================

  describe('DEFAULT_QUALITY_LEVEL and DEFAULT_QUALITY_PROFILE', () => {
    it('should define DEFAULT_QUALITY_LEVEL as a valid level', () => {
      expect(isValidQualityLevel(DEFAULT_QUALITY_LEVEL)).toBe(true);
    });

    it('should define DEFAULT_QUALITY_PROFILE with consistent settings', () => {
      expect(DEFAULT_QUALITY_PROFILE.level).toBe(DEFAULT_QUALITY_LEVEL);
      expect(DEFAULT_QUALITY_PROFILE).toEqual(createQualityProfile(DEFAULT_QUALITY_LEVEL));
    });

    it('should default to MEDIUM quality for balanced experience', () => {
      // Default should not be the lowest or highest to give balanced experience
      expect(DEFAULT_QUALITY_LEVEL).toBe(VisualQualityLevel.Medium);
    });

    it('should have complete profile configuration', () => {
      expect(DEFAULT_QUALITY_PROFILE).toHaveProperty('level');
      expect(DEFAULT_QUALITY_PROFILE).toHaveProperty('shadowsEnabled');
      expect(DEFAULT_QUALITY_PROFILE).toHaveProperty('texturesEnabled');
      expect(DEFAULT_QUALITY_PROFILE).toHaveProperty('particlesEnabled');
      expect(DEFAULT_QUALITY_PROFILE).toHaveProperty('postProcessingEnabled');
      expect(DEFAULT_QUALITY_PROFILE).toHaveProperty('maxLights');
    });
  });

  // ========================================================================
  // Integration Tests
  // ========================================================================

  describe('Integration Tests', () => {
    it('should allow switching between quality levels', () => {
      const highProfile = createQualityProfile(VisualQualityLevel.High);
      const mediumProfile = createQualityProfile(VisualQualityLevel.Medium);
      const lowProfile = createQualityProfile(VisualQualityLevel.Low);

      // Verify each profile is distinct
      expect(highProfile).not.toEqual(mediumProfile);
      expect(mediumProfile).not.toEqual(lowProfile);
      expect(highProfile).not.toEqual(lowProfile);
    });

    it('should maintain consistency across multiple calls', () => {
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const profile1 = createQualityProfile(VisualQualityLevel.Medium);
        const profile2 = createQualityProfile(VisualQualityLevel.Medium);

        expect(profile1).toEqual(profile2);
      }
    });

    it('should provide all quality levels with valid configurations', () => {
      const levels = [VisualQualityLevel.High, VisualQualityLevel.Medium, VisualQualityLevel.Low];

      levels.forEach((level) => {
        const profile = createQualityProfile(level);

        // Verify profile structure
        expect(profile).toHaveProperty('level', level);
        expect(typeof profile.shadowsEnabled).toBe('boolean');
        expect(typeof profile.texturesEnabled).toBe('boolean');
        expect(typeof profile.particlesEnabled).toBe('boolean');
        expect(typeof profile.postProcessingEnabled).toBe('boolean');
        expect(typeof profile.maxLights).toBe('number');

        // Verify maxLights is positive
        expect(profile.maxLights).toBeGreaterThan(0);

        // Verify helpers work with the profile level
        expect(isValidQualityLevel(profile.level)).toBe(true);
      });
    });
  });
});
