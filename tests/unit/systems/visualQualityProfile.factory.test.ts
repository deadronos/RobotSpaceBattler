import { describe, it, expect } from 'vitest';

import { VisualQualityLevel } from '../../../../src/systems/matchTrace/types';
import {
  createQualityProfile,
  DEFAULT_QUALITY_LEVEL,
  DEFAULT_QUALITY_PROFILE,
} from '../../../../src/systems/matchTrace/visualQualityProfile';

describe('visualQualityProfile - factory', () => {
  it('should create a HIGH quality profile with all features enabled', () => {
    const profile = createQualityProfile(VisualQualityLevel.High);

    expect(profile.level).toBe(VisualQualityLevel.High);
    expect(profile.shadowsEnabled).toBe(true);
    expect(profile.texturesEnabled).toBe(true);
    expect(profile.particlesEnabled).toBe(true);
    expect(profile.postProcessingEnabled).toBe(true);
    expect(profile.maxLights).toBeGreaterThan(1);
  });

  it('should create a MEDIUM quality profile with balanced features', () => {
    const profile = createQualityProfile(VisualQualityLevel.Medium);

    expect(profile.level).toBe(VisualQualityLevel.Medium);
    expect(typeof profile.maxLights).toBe('number');
  });

  it('should create a LOW quality profile with minimal features', () => {
    const profile = createQualityProfile(VisualQualityLevel.Low);

    expect(profile.level).toBe(VisualQualityLevel.Low);
    expect(profile.shadowsEnabled).toBe(false);
  });

  it('should return consistent profiles for same level', () => {
    const p1 = createQualityProfile(VisualQualityLevel.Medium);
    const p2 = createQualityProfile(VisualQualityLevel.Medium);
    expect(p1).toEqual(p2);
  });

  it('should expose DEFAULT constants', () => {
    expect(DEFAULT_QUALITY_LEVEL).toBeDefined();
    expect(DEFAULT_QUALITY_PROFILE).toBeDefined();
  });
});
