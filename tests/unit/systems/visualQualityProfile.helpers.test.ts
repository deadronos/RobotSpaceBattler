import { describe, it, expect } from 'vitest';

import { VisualQualityLevel } from '../../../src/systems/matchTrace/types';
import {
  getParticleIntensity,
  getShadowMapSize,
  getTextureScale,
  getTrailComplexity,
} from '../../../src/systems/matchTrace/visualQualityProfile';

describe('visualQualityProfile - helpers', () => {
  it('particle intensity ranges', () => {
    const iHigh = getParticleIntensity(VisualQualityLevel.High);
    const iMed = getParticleIntensity(VisualQualityLevel.Medium);
    const iLow = getParticleIntensity(VisualQualityLevel.Low);

    expect(iHigh).toBeGreaterThanOrEqual(0);
    expect(iHigh).toBeLessThanOrEqual(1);
    expect(iMed).toBeGreaterThanOrEqual(0);
    expect(iLow).toBeGreaterThanOrEqual(0);
  });

  it('shadow map sizes are powers of two', () => {
    const sizes = [
      getShadowMapSize(VisualQualityLevel.High),
      getShadowMapSize(VisualQualityLevel.Medium),
      getShadowMapSize(VisualQualityLevel.Low),
    ];

    sizes.forEach((s) => {
      expect([512, 1024, 2048]).toContain(s);
    });
  });

  it('texture scales and trail complexity valid', () => {
    expect(getTextureScale(VisualQualityLevel.High)).toBeGreaterThanOrEqual(0);
    expect(getTrailComplexity(VisualQualityLevel.Low)).toBeGreaterThan(0);
  });
});
