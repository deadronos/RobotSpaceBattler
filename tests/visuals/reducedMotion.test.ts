import { describe, expect, it } from "vitest";

import { resolveMotionEffects } from "../../src/visuals/reducedMotion";

describe("reduced motion visual budget (#166)", () => {
  it("keeps optional layers when motion is allowed", () => {
    expect(
      resolveMotionEffects({
        postprocessingEnabled: true,
        reducedMotion: false,
      }),
    ).toEqual({
      postprocessing: true,
      hitAndMuzzleFlashes: true,
      cameraDamping: true,
    });
  });

  it("still respects the quality setting when motion is allowed", () => {
    expect(
      resolveMotionEffects({
        postprocessingEnabled: false,
        reducedMotion: false,
      }).postprocessing,
    ).toBe(false);
  });

  it("drops post-processing, flashes and camera inertia when reduced", () => {
    expect(
      resolveMotionEffects({
        postprocessingEnabled: true,
        reducedMotion: true,
      }),
    ).toEqual({
      postprocessing: false,
      hitAndMuzzleFlashes: false,
      cameraDamping: false,
    });
  });
});
