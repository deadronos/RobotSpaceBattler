import { describe, it, expect } from "vitest";
import { FixedStepDriver } from "../src/utils/fixedStepDriver";

describe("FixedStepDriver", () => {
  it("advances frame count, time and produces deterministic RNG", () => {
    const seed = 42;
    const step = 1 / 60;
    const d1 = new FixedStepDriver(seed, step);
    const d2 = new FixedStepDriver(seed, step);

    const s1 = d1.stepOnce();
    const s2 = d2.stepOnce();

    expect(s1.frameCount).toBe(1);
    expect(s2.frameCount).toBe(1);
    expect(s1.simNowMs).toBeCloseTo(step * 1000);
    expect(s2.simNowMs).toBeCloseTo(step * 1000);
    // RNG output for same seed+step should match
    expect(s1.rng()).toBe(s2.rng());

    const s1b = d1.stepOnce();
    const s2b = d2.stepOnce();
    expect(s1b.frameCount).toBe(2);
    expect(s2b.frameCount).toBe(2);
    expect(s1b.rng()).toBe(s2b.rng());
  });
});
