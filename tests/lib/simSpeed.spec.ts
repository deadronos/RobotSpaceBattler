import { describe, expect, it } from "vitest";

import {
  DEFAULT_SIM_SPEED,
  formatSimSpeed,
  normalizeSimSpeed,
  scaledSubstepCap,
  SIM_SPEED_OPTIONS,
  type SimSpeed,
} from "../../src/lib/simSpeed";

describe("sim speed options", () => {
  it("offers 0.5x, 1x, 2x and 4x only", () => {
    expect([...SIM_SPEED_OPTIONS]).toEqual([0.5, 1, 2, 4]);
    expect(DEFAULT_SIM_SPEED).toBe(1);
  });
});

describe("normalizeSimSpeed", () => {
  it("keeps supported speeds unchanged", () => {
    for (const speed of SIM_SPEED_OPTIONS) {
      expect(normalizeSimSpeed(speed)).toBe(speed);
    }
  });

  it("snaps unsupported speeds to the nearest option", () => {
    const cases: Array<[number, SimSpeed]> = [
      [0.1, 0.5],
      [0.7, 0.5],
      [0.9, 1],
      [3, 2],
      [10, 4],
      [-2, 0.5],
    ];
    for (const [input, expected] of cases) {
      expect(normalizeSimSpeed(input)).toBe(expected);
    }
  });

  it("falls back to 1x for non-finite input", () => {
    expect(normalizeSimSpeed(Number.NaN)).toBe(1);
    expect(normalizeSimSpeed(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("scaledSubstepCap", () => {
  it("scales the 1x budget with the speed", () => {
    expect(scaledSubstepCap(5, 1)).toBe(5);
    expect(scaledSubstepCap(5, 2)).toBe(10);
    expect(scaledSubstepCap(5, 4)).toBe(20);
  });

  it("rounds a fractional budget up and never drops below one", () => {
    expect(scaledSubstepCap(5, 0.5)).toBe(3);
    expect(scaledSubstepCap(1, 0.5)).toBe(1);
  });

  it("uses the normalised speed", () => {
    expect(scaledSubstepCap(5, 3.9)).toBe(20);
  });
});

describe("formatSimSpeed", () => {
  it("renders a multiplier label", () => {
    expect(formatSimSpeed(0.5)).toBe("0.5×");
    expect(formatSimSpeed(1)).toBe("1×");
    expect(formatSimSpeed(4)).toBe("4×");
  });
});
