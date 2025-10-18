/**
 * Visual Quality Profile Manager — Quality Level Configuration (T027, US2)
 *
 * Manages visual quality profiles for match rendering with three preset levels:
 * - High: Full effects (shadows, textures, particles, post-processing)
 * - Medium: Balanced effects (selective shadows, texture streaming)
 * - Low: Performance mode (minimal effects, simplified materials)
 *
 * Provides factory methods to create profiles and helpers for quality-dependent
 * rendering decisions. All profiles preserve simulation correctness; only visual
 * fidelity varies.
 *
 * Input: VisualQualityLevel selection
 * Output: VisualQualityProfile configuration for renderer
 */

import type { VisualQualityLevel, VisualQualityProfile } from './types';
import { VisualQualityLevel as QLvl } from './types';

// ============================================================================
// Quality Profile Factory
// ============================================================================

/**
 * Create a visual quality profile for the given quality level.
 *
 * @param level - Quality level (high, medium, low)
 * @returns Configured VisualQualityProfile with all settings
 */
export function createQualityProfile(level: VisualQualityLevel): VisualQualityProfile {
  switch (level) {
    case QLvl.High:
      return {
        level: QLvl.High,
        shadowsEnabled: true,
        texturesEnabled: true,
        particlesEnabled: true,
        postProcessingEnabled: true,
        maxLights: 8,
      };

    case QLvl.Medium:
      return {
        level: QLvl.Medium,
        shadowsEnabled: true, // Shadows on, but map size reduced
        texturesEnabled: true, // Textures on, but lower resolution
        particlesEnabled: true, // Limited particle density
        postProcessingEnabled: false, // No bloom/effects
        maxLights: 4,
      };

    case QLvl.Low:
      return {
        level: QLvl.Low,
        shadowsEnabled: false,
        texturesEnabled: false, // Use colors instead of textures
        particlesEnabled: false, // No particles
        postProcessingEnabled: false,
        maxLights: 2,
      };

    default:
      // Fallback to Medium for unknown levels
      return createQualityProfile(QLvl.Medium);
  }
}

// ============================================================================
// Quality Profile Defaults
// ============================================================================

/** Default quality level for new matches */
export const DEFAULT_QUALITY_LEVEL: VisualQualityLevel = QLvl.Medium;

/** Default quality profile (Medium mode) */
export const DEFAULT_QUALITY_PROFILE: VisualQualityProfile = createQualityProfile(
  DEFAULT_QUALITY_LEVEL,
);

// ============================================================================
// Quality Helper Functions
// ============================================================================

/**
 * Determine particle count based on quality level.
 *
 * Used by RenderedProjectile and other effect components to scale
 * particle density without breaking the visual contract.
 *
 * @param level - Quality level
 * @returns Particle count multiplier (1.0 = normal, 0.5 = half, 0 = none)
 */
export function getParticleIntensity(level: VisualQualityLevel): number {
  switch (level) {
    case QLvl.High:
      return 1.0; // 100% particles
    case QLvl.Medium:
      return 0.5; // 50% particles
    case QLvl.Low:
      return 0; // No particles
    default:
      return 0.5;
  }
}

/**
 * Determine shadow map resolution based on quality level.
 *
 * @param level - Quality level
 * @returns Shadow map resolution (512, 1024, 2048)
 */
export function getShadowMapSize(level: VisualQualityLevel): number {
  switch (level) {
    case QLvl.High:
      return 2048; // High resolution shadows
    case QLvl.Medium:
      return 1024; // Medium resolution
    case QLvl.Low:
      return 512; // Low resolution (rarely used since shadows disabled)
    default:
      return 1024;
  }
}

/**
 * Determine texture resolution scale based on quality level.
 *
 * @param level - Quality level
 * @returns Texture scale multiplier (1.0 = full, 0.5 = half)
 */
export function getTextureScale(level: VisualQualityLevel): number {
  switch (level) {
    case QLvl.High:
      return 1.0; // Full resolution
    case QLvl.Medium:
      return 0.75; // 75% resolution
    case QLvl.Low:
      return 0; // No textures, use colors
    default:
      return 0.75;
  }
}

/**
 * Get trail complexity (subdivisions) for projectile trails.
 *
 * @param level - Quality level
 * @returns Trail segment count
 */
export function getTrailComplexity(level: VisualQualityLevel): number {
  switch (level) {
    case QLvl.High:
      return 32; // Many trail segments
    case QLvl.Medium:
      return 16; // Medium segments
    case QLvl.Low:
      return 4; // Minimal segments
    default:
      return 16;
  }
}

/**
 * Check if a feature is enabled for the given quality level.
 *
 * @param profile - Quality profile
 * @param feature - Feature name (shadows, textures, particles, postProcessing)
 * @returns true if feature enabled, false otherwise
 */
export function isFeatureEnabled(
  profile: VisualQualityProfile,
  feature: 'shadows' | 'textures' | 'particles' | 'postProcessing',
): boolean {
  switch (feature) {
    case 'shadows':
      return profile.shadowsEnabled;
    case 'textures':
      return profile.texturesEnabled;
    case 'particles':
      return profile.particlesEnabled;
    case 'postProcessing':
      return profile.postProcessingEnabled;
    default:
      return false;
  }
}

// ============================================================================
// Quality Level Validation
// ============================================================================

/**
 * Check if a value is a valid VisualQualityLevel.
 *
 * @param value - Value to check
 * @returns true if valid level, false otherwise
 */
export function isValidQualityLevel(value: unknown): value is VisualQualityLevel {
  return value === QLvl.High || value === QLvl.Medium || value === QLvl.Low;
}
