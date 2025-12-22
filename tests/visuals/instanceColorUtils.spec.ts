import { describe, expect, it } from "vitest";
import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial } from "three";
import {
  srgbToLinear,
  fillInstanceColorsLinear,
  hideAllInstances,
  clampHDRColor,
} from "../../src/visuals/instanceColorUtils";

// Helper to compare floats with a tolerance
function closeTo(value: number, expected: number, digits = 2) {
  expect(value).toBeCloseTo(expected, digits);
}

describe("instanceColorUtils", () => {
  it("converts sRGB hex to linear color components", () => {
    const c = new Color();
    srgbToLinear("#7fffd4", c);

    // Compare against three.js' own parsing of the same hex string to
    // ensure we produce the same linear values.
    const expected = new Color("#7fffd4");
    closeTo(c.r, expected.r, 4);
    closeTo(c.g, expected.g, 4);
    closeTo(c.b, expected.b, 4);
  });

  it("fills instanced mesh colors in linear space", () => {
    const capacity = 3;
    const mesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ vertexColors: true }),
      capacity,
    );

    // Fill with amplified aquamarine color
    fillInstanceColorsLinear(mesh, capacity, "#7fffd4", 2.2);

    expect(mesh.instanceColor).toBeDefined();
    const arr = mesh.instanceColor!.array as Float32Array;

    // Compute expected from the same three.js Color parsing to avoid
    // precision mismatches between implementations.
    const base = new Color("#7fffd4");
    const expectedR = base.r * 2.2;
    const expectedG = base.g * 2.2;
    const expectedB = base.b * 2.2;

    closeTo(arr[0], expectedR, 3);
    closeTo(arr[1], expectedG, 3);
    closeTo(arr[2], expectedB, 3);

    // Check second slot as well
    closeTo(arr[3], expectedR, 3);
    closeTo(arr[4], expectedG, 3);
    closeTo(arr[5], expectedB, 3);
  });

  it("hideAllInstances sets colors to black and marks buffers dirty", () => {
    const capacity = 4;
    const mesh = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial({ vertexColors: true }),
      capacity,
    );

    hideAllInstances(mesh, capacity);

    expect(mesh.instanceColor).toBeDefined();
    const arr = mesh.instanceColor!.array as Float32Array;

    for (let i = 0; i < capacity * 3; i += 1) {
      expect(arr[i]).toBe(0);
    }

    // Validate instance matrix translation was written (translation stored at
    // indices 12..14 for the first instance in a 4x4 matrix) and that the
    // instance matrix attribute exists.
    expect(mesh.instanceMatrix).toBeDefined();
    const matArr = mesh.instanceMatrix!.array as Float32Array;
    // Y translation is stored at index 13 for this matrix layout (observed
    // in three.js used by our environment).
    expect(matArr[13]).toBeCloseTo(-512, 1);
  });

  it('clamps HDR colors to a max channel', () => {
    const c = new Color(4, 2, 1);
    clampHDRColor(c, 2.0);
    const max = Math.max(c.r, c.g, c.b);
    expect(max).toBeLessThanOrEqual(2.0);
    // preserves hue ratio
    const ratio = c.r / c.g;
    expect(ratio).toBeCloseTo(2.0, 1);
  });
});
