import { createSeededRng } from "../utils/seededRng";

export type StepContext = {
  frameCount: number;
  simNowMs: number;
  rng: ReturnType<typeof createSeededRng>;
  step: number;
};

export class FixedStepDriver {
  private seed: number;
  private step: number;
  private frameCount = 0;
  private simTimeMs = 0;

  constructor(seed: number, step: number) {
    this.seed = seed;
    this.step = step;
  }

  // Advance the driver by a single fixed step and return the step context
  stepOnce(): StepContext {
    this.frameCount++;
    this.simTimeMs += this.step * 1000;
    const rng = createSeededRng(this.seed + this.frameCount);
    return {
      frameCount: this.frameCount,
      simNowMs: this.simTimeMs,
      rng,
      step: this.step,
    };
  }

  reset(seed: number, step: number) {
    this.seed = seed;
    this.step = step;
    this.frameCount = 0;
    this.simTimeMs = 0;
  }
}

export function createFixedStepDriver(seed: number, step: number) {
  return new FixedStepDriver(seed, step);
}
