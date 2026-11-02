import { describe, expect, it } from "vitest";

import { resolveCanvasAntialias } from "../../src/visuals/canvasSettings";

describe("canvas antialias", () => {
  it("is off when the effect composer owns antialiasing", () => {
    expect(
      resolveCanvasAntialias({
        postprocessingEnabled: true,
        reducedMotion: false,
      }),
    ).toBe(false);
  });

  it("is on when there is no composer to antialias the scene", () => {
    expect(
      resolveCanvasAntialias({
        postprocessingEnabled: false,
        reducedMotion: false,
      }),
    ).toBe(true);
    // Reduced motion disables the composer (#166), so the canvas has to cope.
    expect(
      resolveCanvasAntialias({
        postprocessingEnabled: true,
        reducedMotion: true,
      }),
    ).toBe(true);
  });
});
