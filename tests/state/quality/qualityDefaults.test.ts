import { describe, expect, it } from "vitest";

import {
  buildQualitySettings,
  detectPerformanceTier,
  resolveDefaultDpr,
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

  it("defaults to native DPR capped at 1.5", () => {
    const original = window.devicePixelRatio;
    const setRatio = (value: number | undefined) =>
      Object.defineProperty(window, "devicePixelRatio", {
        value,
        configurable: true,
      });
    try {
      setRatio(1);
      expect(buildQualitySettings({ perfTier: "low" }).visuals.render.dpr).toBe(
        1,
      );
      setRatio(2);
      expect(
        buildQualitySettings({ perfTier: "high" }).visuals.render.dpr,
      ).toBe(1.5);
      setRatio(1.25);
      expect(resolveDefaultDpr()).toBe(1.25);
      setRatio(undefined);
      expect(resolveDefaultDpr()).toBe(1);
    } finally {
      setRatio(original);
    }
  });
});
