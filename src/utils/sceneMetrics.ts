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
  const candidateKeys: (keyof Material)[] = [
    'map',
    'roughnessMap',
    'normalMap',
    'aoMap',
    'metalnessMap',
    'emissiveMap',
    'displacementMap',
  ];

  candidateKeys.forEach((key) => {
    const texture = material[key as keyof Material];
    if (texture && texture instanceof Texture) {
      target.add(texture);
    }
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
