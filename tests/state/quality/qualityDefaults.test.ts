import { describe, expect, it } from "vitest";

import {
  buildQualitySettings,
  detectPerformanceTier,
} from "../../../src/state/quality/qualityDefaults";

describe("detectPerformanceTier", () => {
  it("prefers low tier when reduced motion is requested", () => {
    expect(
      detectPerformanceTier({
        prefersReducedMotion: true,
        deviceMemory: 16,
        hardwareConcurrency: 16,
      }),
    ).toBe("low");
  });

  it("returns high tier for high memory devices", () => {
    expect(
      detectPerformanceTier({
        prefersReducedMotion: false,
        deviceMemory: 8,
        hardwareConcurrency: 8,
      }),
    ).toBe("high");
  });

  it("returns medium tier for mid-range devices", () => {
    expect(
      detectPerformanceTier({
        prefersReducedMotion: false,
        deviceMemory: 6,
        hardwareConcurrency: 6,
      }),
    ).toBe("medium");
  });
});

describe("buildQualitySettings", () => {
  it("defaults to instancing enabled", () => {
    const settings = buildQualitySettings({ perfTier: "low" });
    expect(settings.visuals.instancing.enabled).toBe(true);
  });

  it("turns off postprocessing and shadows on low tier", () => {
    const settings = buildQualitySettings({ perfTier: "low" });
    expect(settings.visuals.postprocessing.enabled).toBe(false);
    expect(settings.visuals.render.shadowsEnabled).toBe(false);
  });

  it("allows overrides to enable features", () => {
    const settings = buildQualitySettings({
      perfTier: "low",
      postprocessingEnabled: true,
      shadowsEnabled: true,
      instancingEnabled: false,
    });
    expect(settings.visuals.postprocessing.enabled).toBe(true);
    expect(settings.visuals.render.shadowsEnabled).toBe(true);
    expect(settings.visuals.instancing.enabled).toBe(false);
  });

  it("defaults to a conservative DPR baseline and relies on dynamic scaling", () => {
    const lowTier = buildQualitySettings({ perfTier: "low" });
    const highTier = buildQualitySettings({ perfTier: "high" });
    // We now start conservatively at 0.5 DPR and allow the DynamicResScaler to
    // increase DPR at runtime when performance allows.
    expect(lowTier.visuals.render.dpr).toBe(0.5);
    expect(highTier.visuals.render.dpr).toBe(0.5);
  });
});
