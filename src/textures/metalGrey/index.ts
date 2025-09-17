import { DataTexture, LinearFilter, LinearSRGBColorSpace, RepeatWrapping, SRGBColorSpace, Texture } from 'three';

export interface MetalTextureSet {
  map: Texture;
  roughnessMap: Texture;
  normalMap: Texture;
  aoMap: Texture;
}

function createCheckerboardTexture(
  size: number,
  colorA: [number, number, number],
  colorB: [number, number, number],
  colorSpace: typeof SRGBColorSpace | typeof LinearSRGBColorSpace,
  repeat: number,
) {
  const pixels = new Uint8Array(size * size * 3);
  const blockSize = size / 2;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 3;
      const useA = (x < blockSize && y < blockSize) || (x >= blockSize && y >= blockSize);
      const [r, g, b] = useA ? colorA : colorB;
      pixels[offset] = r;
      pixels[offset + 1] = g;
      pixels[offset + 2] = b;
    }
  }

  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  return texture;
}

function createSolidTexture(
  size: number,
  value: [number, number, number],
  colorSpace: typeof SRGBColorSpace | typeof LinearSRGBColorSpace,
  repeat: number,
) {
  const pixels = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    const offset = i * 3;
    pixels[offset] = value[0];
    pixels[offset + 1] = value[1];
    pixels[offset + 2] = value[2];
  }

  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = colorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  return texture;
}

function createNormalTexture(size: number, repeat: number) {
  const pixels = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    const offset = i * 3;
    pixels[offset] = 128;
    pixels[offset + 1] = 128;
    pixels[offset + 2] = 255;
  }

  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = LinearSRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.needsUpdate = true;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  return texture;
}

export function createPlaceholderMetalTextureSet(repeat = 4): MetalTextureSet {
  const size = 4;
  return {
    map: createCheckerboardTexture(size, [134, 138, 150], [110, 114, 124], SRGBColorSpace, repeat),
    roughnessMap: createCheckerboardTexture(size, [180, 180, 180], [150, 150, 150], LinearSRGBColorSpace, repeat),
    normalMap: createNormalTexture(size, repeat),
    aoMap: createSolidTexture(size, [210, 210, 210], LinearSRGBColorSpace, repeat),
  };
}
