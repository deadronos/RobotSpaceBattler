import { describe, expect, it } from 'vitest';
import { Mesh, MeshStandardMaterial, Scene, SphereGeometry } from 'three';

import { createMetalGreyMaterial, loadPlaceholderMetalTextures } from '../src/utils/materials';
import { collectSceneMetrics } from '../src/utils/sceneMetrics';

describe('scene metrics utility', () => {
  it('counts meshes, lights, materials, and textures', () => {
    const scene = new Scene();
    const geometry = new SphereGeometry(1, 8, 8);
    const materialA = createMetalGreyMaterial();
    const materialB = new MeshStandardMaterial({ color: '#ff0000' });
    const meshA = new Mesh(geometry, materialA);
    const meshB = new Mesh(geometry, materialB);
    scene.add(meshA);
    scene.add(meshB);

    const metrics = collectSceneMetrics(scene);
    expect(metrics.meshes).toBe(2);
    expect(metrics.materials).toBe(2);
    expect(metrics.textures).toBeGreaterThan(0);
    expect(metrics.geometries).toBe(1);
  });

  it('reuses placeholder textures across materials', () => {
    const textureSet = loadPlaceholderMetalTextures();
    const matA = createMetalGreyMaterial();
    const matB = createMetalGreyMaterial();
    expect(matA.map).toBe(textureSet.map);
    expect(matB.map).toBe(textureSet.map);
  });
});
