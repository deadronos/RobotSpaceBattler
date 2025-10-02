import { describe, it, expect } from "vitest";

import { updateStreakState, type MutableStreakState } from "../src/components/ProjectileStreak";

function createState(): MutableStreakState {
  return {
    visible: false,
    length: 0,
    nx: 0,
    ny: 1,
    nz: 0,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
  };
}

describe("updateStreakState", () => {
  it("hides streak when velocity is missing or below threshold", () => {
    const state = createState();
    updateStreakState(state, undefined);
    expect(state.visible).toBe(false);
    expect(state.length).toBe(0);

    const slow = createState();
    updateStreakState(slow, [0.01, 0.01, 0]);
    expect(slow.visible).toBe(false);
    expect(slow.length).toBe(0);
  });

  it("normalizes velocity direction and scales length between min/max", () => {
    const state = createState();
    updateStreakState(state, [10, 0, 0]);
    expect(state.visible).toBe(true);
    expect(state.length).toBeCloseTo(0.3, 5);
    expect(state.nx).toBe(1);
    expect(state.offsetX).toBeCloseTo(-0.15, 5);
    expect(state.offsetY).toBeCloseTo(0, 5);
  });

  it("clamps length to min and max bounds", () => {
    const minState = createState();
    updateStreakState(minState, [0.2, 0.2, 0]);
    expect(minState.visible).toBe(true);
    expect(minState.length).toBeCloseTo(0.25, 5);
    const invSqrt2 = 1 / Math.sqrt(2);
    expect(minState.nx).toBeCloseTo(invSqrt2, 5);
    expect(minState.ny).toBeCloseTo(invSqrt2, 5);

    const maxState = createState();
    updateStreakState(maxState, [200, 0, 0]);
    expect(maxState.length).toBe(2);
    expect(maxState.offsetX).toBe(-1);
  });
});