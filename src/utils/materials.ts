import {
  Color,
  MeshStandardMaterial,
  MeshStandardMaterialParameters,
  Vector2,
} from "three";

import {
  createPlaceholderMetalTextureSet,
  MetalTextureSet,
} from "../textures/metalGrey";

export interface PlaceholderTextureOptions {
  repeat?: number;
}

const PLACEHOLDER_TILE_REPEAT = 4;
const DEFAULT_NORMAL_SCALE = new Vector2(0.6, 0.6);
const DEFAULT_METAL_COLOR = new Color("#7f8593");
const DEFAULT_METALNESS = 0.85;
const DEFAULT_ROUGHNESS = 0.32;
const DEFAULT_AO_INTENSITY = 0.8;
const DEFAULT_EMISSIVE_COLOR = new Color("#36d3ff");
const DEFAULT_EMISSIVE_INTENSITY = 2.4;

const PLACEHOLDER_TEXTURES = createPlaceholderMetalTextureSet(
  PLACEHOLDER_TILE_REPEAT,
);

/**
 * Returns the shared placeholder texture set used by the metallic spacestation kit.
 * Textures are generated procedurally and tile cleanly to minimise seams.
 */
export function loadPlaceholderMetalTextures(): MetalTextureSet {
  return PLACEHOLDER_TEXTURES;
}

export interface MetalMaterialOptions
  extends Omit<MeshStandardMaterialParameters, "color"> {
  color?: Color | string | number;
  textures?: Partial<MetalTextureSet>;
  normalScaleScalar?: number;
}

/**
 * Creates a MeshStandardMaterial pre-configured for the metallic grey kit.
 * Materials reuse the shared placeholder textures by default to reduce draw calls.
 */
export function createMetalGreyMaterial(options: MetalMaterialOptions = {}) {
  const {
    textures: textureOverrides,
    normalScaleScalar,
    normalScale,
    color,
    ...rest
  } = options;
  const placeholder = loadPlaceholderMetalTextures();
  const material = new MeshStandardMaterial({
    color: color ?? DEFAULT_METAL_COLOR,
    metalness: rest.metalness ?? DEFAULT_METALNESS,
    roughness: rest.roughness ?? DEFAULT_ROUGHNESS,
    envMapIntensity: rest.envMapIntensity ?? 1.1,
    aoMapIntensity: rest.aoMapIntensity ?? DEFAULT_AO_INTENSITY,
    map: textureOverrides?.map ?? placeholder.map,
    roughnessMap: textureOverrides?.roughnessMap ?? placeholder.roughnessMap,
    normalMap: textureOverrides?.normalMap ?? placeholder.normalMap,
    aoMap: textureOverrides?.aoMap ?? placeholder.aoMap,
    ...rest,
  });

  if (normalScale instanceof Vector2) {
    material.normalScale = normalScale.clone();
  } else if (typeof normalScaleScalar === "number") {
    material.normalScale = new Vector2(normalScaleScalar, normalScaleScalar);
  } else {
    material.normalScale = DEFAULT_NORMAL_SCALE.clone();
  }

  return material;
}

export interface EmissiveMaterialOptions extends MetalMaterialOptions {
  emissive?: Color | string | number;
  emissiveIntensity?: number;
}

/**
 * Convenience wrapper around {@link createMetalGreyMaterial} that applies emissive defaults
 * for glowing environment props such as light panels.
 */
export function createEmissiveMaterial(options: EmissiveMaterialOptions = {}) {
  const {
    emissive = DEFAULT_EMISSIVE_COLOR,
    emissiveIntensity = DEFAULT_EMISSIVE_INTENSITY,
    ...rest
  } = options;
  return createMetalGreyMaterial({
    emissive,
    emissiveIntensity,
    ...rest,
  });
}
