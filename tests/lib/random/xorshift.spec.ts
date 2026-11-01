import { describe, expect, it } from "vitest";

import { createXorShift32 } from "../../../src/lib/random/xorshift";

const SAMPLE = 100_000;

describe("createXorShift32", () => {
  it("returns values in [0, 1)", () => {
    const rng = createXorShift32(2024);
    let min = 1;
    let max = 0;
    for (let i = 0; i < SAMPLE; i += 1) {
      const value = rng.next();
      if (value < min) min = value;
      if (value > max) max = value;
    }

    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThan(1);
  });

  it("never returns negative values (regression: int32 coercion)", () => {
    const rng = createXorShift32(1);
    let negatives = 0;
    for (let i = 0; i < SAMPLE; i += 1) {
      if (rng.next() < 0) negatives += 1;
    }

    expect(negatives).toBe(0);
  });

  it("splits rolls near 50/50 so gameplay thresholds are unbiased", () => {
    const rng = createXorShift32(777);
    let aboveHalf = 0;
    for (let i = 0; i < SAMPLE; i += 1) {
      if (rng.next() >= 0.5) aboveHalf += 1;
    }

    // A signed [-1, 1) stream only puts 25% of its values above 0.5.
    expect(aboveHalf / SAMPLE).toBeGreaterThan(0.49);
    expect(aboveHalf / SAMPLE).toBeLessThan(0.51);
  });

  it("is deterministic for a seed and differs between seeds", () => {
    const a = createXorShift32(4242);
    const b = createXorShift32(4242);
    const c = createXorShift32(4243);

    const aValues = Array.from({ length: 16 }, () => a.next());
    const bValues = Array.from({ length: 16 }, () => b.next());
    const cValues = Array.from({ length: 16 }, () => c.next());

    expect(aValues).toEqual(bValues);
    expect(aValues).not.toEqual(cValues);
  });

  it("keeps producing usable values for the zero seed", () => {
    const rng = createXorShift32(0);

    expect(rng.seed).not.toBe(0);
    for (let i = 0; i < 16; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
