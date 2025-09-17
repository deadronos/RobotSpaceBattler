import { BufferGeometry, Light, Material, Mesh, Object3D, Scene, Texture } from 'three';

export interface SceneMetrics {
  meshes: number;
  lights: number;
  materials: number;
  textures: number;
  geometries: number;
}

export interface MetricsOptions {
  includeChildren?: boolean;
}

function collectMaterialTextures(material: Material, target: Set<Texture>) {
  // Many Three.js material types expose common texture slots. We probe a safe list.
  const candidateKeys = [
    'map',
    'roughnessMap',
    'normalMap',
    'aoMap',
    'metalnessMap',
    'emissiveMap',
    'displacementMap',
  ] as const;

  const getSlot = (mat: Material, key: (typeof candidateKeys)[number]): Texture | undefined => {
    const record = mat as unknown as Record<string, unknown>;
    const value = record[key];
    return value instanceof Texture ? value : undefined;
  };

  candidateKeys.forEach((key) => {
    const texture = getSlot(material, key);
    if (texture) target.add(texture);
  });
}

export function collectSceneMetrics(root: Object3D | Scene): SceneMetrics {
  const meshes = new Set<Mesh>();
  const lights = new Set<Light>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const geometries = new Set<BufferGeometry>();

  root.traverse((object) => {
    if (object instanceof Mesh) {
      meshes.add(object);
      const material = object.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => {
          materials.add(entry);
          collectMaterialTextures(entry, textures);
        });
      } else if (material) {
        materials.add(material);
        collectMaterialTextures(material, textures);
      }

      if (object.geometry) {
        geometries.add(object.geometry);
      }
    }

    if ('isLight' in object && (object as Light).isLight) {
      lights.add(object as Light);
    }
  });

  return {
    meshes: meshes.size,
    lights: lights.size,
    materials: materials.size,
    textures: textures.size,
    geometries: geometries.size,
  };
}
