import { describe, expect, it } from 'vitest';

import { createEmissiveMaterial, createMetalGreyMaterial, loadPlaceholderMetalTextures } from '../src/utils/materials';

describe('materials utilities', () => {
  it('provides shared placeholder textures with repeat tiling', () => {
    const textures = loadPlaceholderMetalTextures();
    expect(textures.map.repeat.x).toBeGreaterThan(1);
    expect(textures.map.repeat.x).toBe(textures.map.repeat.y);
    expect(textures.normalMap).toBeDefined();
    expect(textures.aoMap).toBeDefined();
  });

  it('creates a metal material with expected defaults', () => {
    const material = createMetalGreyMaterial();
    expect(material.metalness).toBeCloseTo(0.85);
    expect(material.roughness).toBeCloseTo(0.32);
    expect(material.normalMap).toBe(loadPlaceholderMetalTextures().normalMap);
    expect(material.normalScale.x).toBeCloseTo(0.6);
    expect(material.normalScale.y).toBeCloseTo(0.6);
  });

  it('creates an emissive variant with higher intensity', () => {
    const material = createEmissiveMaterial();
    expect(material.emissiveIntensity).toBeGreaterThan(1.5);
    expect(material.emissive).toBeDefined();
  });

  it('allows overriding textures', () => {
    const placeholder = loadPlaceholderMetalTextures();
    const customMaterial = createMetalGreyMaterial({
      textures: { map: placeholder.aoMap },
    });
    expect(customMaterial.map).toBe(placeholder.aoMap);
  });
});
