/**
 * Integration test verifying deterministic FixedStepDriver behavior.
 *
 * Expectations (to be satisfied by upcoming implementation tasks):
 * - StepContext includes deterministic idFactory tied to frameCount/simNowMs
 * - Running two drivers with the same seed yields identical StepContext traces
 * - RNG outputs remain identical across runs given the same seed
 */

import { describe, it, expect } from "vitest";
import { FixedStepDriver } from "../../src/utils/fixedStepDriver";
import { createSeededRng } from "../../src/utils/seededRng";

function collectTrace(driver: FixedStepDriver, steps: number) {
  const trace: Array<{
    frameCount: number;
    simNowMs: number;
    step: number;
    rngSample: number;
    idSample: string;
  }> = [];

  for (let i = 0; i < steps; i++) {
    // Upcoming implementation should return idFactory and rng on context
    const ctx: any = driver.stepOnce();
    const idFactory = ctx.idFactory ?? (() => "missing-id");
    const rngSample = ctx.rng ? ctx.rng() : -1;
    trace.push({
      frameCount: ctx.frameCount,
      simNowMs: ctx.simNowMs,
      step: ctx.step,
      rngSample,
      idSample: idFactory(),
    });
  }

  return trace;
}

describe("simulation determinism", () => {
  it("should emit deterministic StepContext with idFactory", () => {
    const driver = new FixedStepDriver(123, 1 / 60);
    const trace = collectTrace(driver, 5);

    expect(trace).toHaveLength(5);
    for (let i = 0; i < trace.length; i++) {
      const step = trace[i];
      expect(typeof step.idSample).toBe("string");
      expect(step.idSample).not.toBe("missing-id");
      expect(step.frameCount).toBe(i + 1);
    }
  });

  it("should match traces for identical seeds", () => {
    const steps = 10;
    const driverA = new FixedStepDriver(999, 1 / 60);
    const driverB = new FixedStepDriver(999, 1 / 60);

    const traceA = collectTrace(driverA, steps);
    const traceB = collectTrace(driverB, steps);

    expect(traceA.length).toBe(traceB.length);
    for (let i = 0; i < steps; i++) {
      expect(traceA[i].frameCount).toBe(traceB[i].frameCount);
      expect(traceA[i].simNowMs).toBe(traceB[i].simNowMs);
      expect(traceA[i].idSample).toBe(traceB[i].idSample);
      expect(traceA[i].rngSample).toBe(traceB[i].rngSample);
    }
  });
});
