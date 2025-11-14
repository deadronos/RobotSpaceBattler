import { describe, it, expect } from "vitest";
import { QualityManager } from "../../src/visuals/QualityManager";

describe("QualityManager", () => {
  it("defaults to high profile with full fidelity", () => {
    const manager = new QualityManager();
    const settings = manager.getSettings();

    expect(settings.showBeams).toBe(true);
    expect(settings.showTracers).toBe(true);
    expect(settings.particleDensity).toBeGreaterThanOrEqual(0.9);
    expect(settings.beamLineWidth).toBeGreaterThanOrEqual(0.2);
  });

  it("notifies subscribers when profile changes", () => {
    const manager = new QualityManager();
    const updates: any[] = [];

    const unsubscribe = manager.onChange((settings) => {
      updates.push(settings);
    });

    manager.setProfile("low");
    manager.setProfile("low");
    manager.setProfile("medium");
    unsubscribe();
    manager.setProfile("high");

    expect(updates).toHaveLength(2);
    expect(updates[0].particleDensity).toBeLessThanOrEqual(0.4);
    expect(updates[1].particleDensity).toBeGreaterThanOrEqual(0.5);
  });
});
