import { BufferAttribute, BufferGeometry, Color, InstancedMesh, Object3D } from "three";

export function ensureGeometryHasVertexColors(
  geometry: BufferGeometry,
  color: string | number | Color = 0xffffff,
) {
  const position = geometry.getAttribute("position");
  if (!position) return;

  const existing = geometry.getAttribute("color");
  if (existing && existing.count === position.count) return;

  const tmp = new Color();
  tmp.set(color as string | number | Color);

  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i += 1) {
    const base = i * 3;
    colors[base] = tmp.r;
    colors[base + 1] = tmp.g;
    colors[base + 2] = tmp.b;
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
}

/**
 * Convert an sRGB color (hex string or Color) into linear space and return it.
 * Reuses the provided `out` Color when supplied.
 */
export function srgbToLinear(
  hexOrColor: string | number | Color,
  out: Color = new Color(),
): Color {
  // three.js color parsing of hex strings already yields linear-space values
  // (CSS hex -> normalized linear). We only need to convert when the input
  // is an explicit Color instance that holds sRGB numeric values.
  if (typeof hexOrColor === "string" || typeof hexOrColor === "number") {
    out.set(hexOrColor as string | number);
  } else {
    out.copy(hexOrColor as Color);
    out.convertSRGBToLinear();
  }
  return out;
}

/**
 * Fill all instance color slots with the given color (optionally multiplied),
 * converting to linear space before writing to the attribute.
 */
export function fillInstanceColorsLinear(
  mesh: InstancedMesh,
  capacity: number,
  hexOrColor: string | number | Color,
  multiplier = 1,
) {
  const tmp = new Color();
  if (typeof hexOrColor === "string" || typeof hexOrColor === "number") {
    tmp.set(hexOrColor as string | number);
    if (multiplier !== 1) tmp.multiplyScalar(multiplier);
  } else {
    tmp.copy(hexOrColor as Color);
    if (multiplier !== 1) tmp.multiplyScalar(multiplier);
    // If the provided Color was a sRGB numeric Color, convert it to linear.
    tmp.convertSRGBToLinear();
  }

  for (let i = 0; i < capacity; i += 1) {
    mesh.setColorAt(i, tmp);
  }

  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

/**
 * Hide all instances by pushing them offscreen and setting their colors to black.
 * Also marks instance buffers as needing updates.
 */
export function clampHDRColor(color: Color, maxChannel = 2.0): Color {
  const m = Math.max(color.r, color.g, color.b);
  if (m > 0 && m > maxChannel) {
    color.multiplyScalar(maxChannel / m);
  }
  return color;
}

/**
 * Normalize HDR linear color for instance display by clamping large peaks and
 * applying a tone-mapping curve (Reinhard) in linear space.
 * Returns the same Color instance for convenience.
 */
export function normalizeHDRForInstance(
  color: Color,
  {
    exposure = 1.0,
    maxChannel = 2.0,
    method = "reinhard",
  }: { exposure?: number; maxChannel?: number; method?: "reinhard" } = {},
): Color {
  // Clamp extreme peaks first to avoid fully saturated channels
  clampHDRColor(color, maxChannel);

  // Apply exposure
  if (exposure !== 1) color.multiplyScalar(exposure);

  // Tone map using Reinhard: c = c / (1 + c)
  if (method === "reinhard") {
    // operate in place
    color.r = color.r / (1 + color.r);
    color.g = color.g / (1 + color.g);
    color.b = color.b / (1 + color.b);
  }

  return color;
}

export function hideAllInstances(mesh: InstancedMesh, capacity: number) {
  if (capacity <= 0) return;

  const dummy = new Object3D();
  dummy.position.set(0, -512, 0);
  dummy.rotation.set(0, 0, 0);
  dummy.scale.set(0.001, 0.001, 0.001);
  dummy.updateMatrix();

  const black = new Color(0x000000);

  for (let index = 0; index < capacity; index += 1) {
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, black);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}
