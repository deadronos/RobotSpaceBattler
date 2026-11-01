import { describe, expect, it, vi } from "vitest";

import { createFixedStepper } from "../../src/lib/fixedStepper";

const DT = 1 / 60;

describe("createFixedStepper", () => {
  it("runs no steps until a full step has accumulated", () => {
    const stepper = createFixedStepper({ stepSeconds: DT, maxSubSteps: 5 });
    const fn = vi.fn();
    expect(stepper.advance(DT / 2, fn)).toBe(0);
    expect(fn).not.toHaveBeenCalled();
    expect(stepper.advance(DT / 2 + 1e-9, fn)).toBe(1);
    expect(fn).toHaveBeenCalledWith(DT);
  });

  it("always steps with the fixed dt, carrying the remainder", () => {
    const stepper = createFixedStepper({ stepSeconds: DT, maxSubSteps: 10 });
    const fn = vi.fn();
    expect(stepper.advance(DT * 2.5, fn)).toBe(2);
    expect(fn.mock.calls.every(([dt]) => dt === DT)).toBe(true);
    expect(stepper.advance(DT * 0.5, fn)).toBe(1);
  });

  it("clamps a huge frame delta to maxSubSteps and drops the backlog", () => {
    const stepper = createFixedStepper({ stepSeconds: DT, maxSubSteps: 5 });
    const fn = vi.fn();
    expect(stepper.advance(60, fn)).toBe(5);
    expect(fn).toHaveBeenCalledTimes(5);
    // Backlog is discarded: next small frame does not trigger a catch-up burst.
    expect(stepper.advance(DT * 0.1, fn)).toBe(0);
  });

  it("ignores non-finite and negative deltas", () => {
    const stepper = createFixedStepper({ stepSeconds: DT, maxSubSteps: 5 });
    const fn = vi.fn();
    expect(stepper.advance(Number.NaN, fn)).toBe(0);
    expect(stepper.advance(-1, fn)).toBe(0);
    expect(fn).not.toHaveBeenCalled();
  });

  it("same total time in different chunkings gives the same step count", () => {
    const a = createFixedStepper({ stepSeconds: DT, maxSubSteps: 100 });
    const b = createFixedStepper({ stepSeconds: DT, maxSubSteps: 100 });
    let na = 0;
    let nb = 0;
    na += a.advance(1, () => {});
    for (let i = 0; i < 100; i += 1) nb += b.advance(0.01, () => {});
    expect(Math.abs(na - nb)).toBeLessThanOrEqual(1);
  });
});
