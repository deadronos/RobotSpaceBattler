import {
  createSeededRng,
  createStepIdFactory,
  type Rng,
} from "./seededRng";

export type StepContext = {
  frameCount: number;
  simNowMs: number;
  rng: Rng;
  step: number;
  idFactory: () => string;
};

type PauseToken = {
  frameCount: number;
  simTimeMs: number;
};

export class FixedStepDriver {
  private seed: number;
  private step: number;
  private frameCount = 0;
  private simTimeMs = 0;
  private paused = false;
  private lastContext: StepContext | null = null;

  constructor(seed: number, step: number) {
    this.seed = seed;
    this.step = step;
  }

  stepOnce(): StepContext {
    if (this.paused && this.lastContext) {
      return this.lastContext;
    }

    this.frameCount++;
    this.simTimeMs += this.step * 1000;
    const rngSeed = stepSeed(this.seed, this.frameCount);
    const rng = createSeededRng(rngSeed);
    const context: StepContext = {
      frameCount: this.frameCount,
      simNowMs: this.simTimeMs,
      rng,
      step: this.step,
      idFactory: createStepIdFactory({
        frameCount: this.frameCount,
        simNowMs: this.simTimeMs,
      }),
    };

    this.lastContext = context;
    return context;
  }

  pause(): PauseToken {
    this.paused = true;
    return { frameCount: this.frameCount, simTimeMs: this.simTimeMs };
  }

  resume(token?: PauseToken) {
    if (token) {
      this.frameCount = token.frameCount;
      this.simTimeMs = token.simTimeMs;
    }
    this.paused = false;
    this.lastContext = null;
  }

  reset(seed: number, step: number) {
    this.seed = seed;
    this.step = step;
    this.frameCount = 0;
    this.simTimeMs = 0;
    this.paused = false;
    this.lastContext = null;
  }
}

export function createFixedStepDriver(seed: number, step: number) {
  return new FixedStepDriver(seed, step);
}

function stepSeed(base: number, frame: number) {
  const constant = 0x9e3779b9;
  return (base ^ (frame * constant)) >>> 0;
}
