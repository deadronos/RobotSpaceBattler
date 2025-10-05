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
  friendlyFire?: boolean;
};

type PauseToken = {
  frameCount: number;
  simNowMs: number;
};

export class FixedStepDriver {
  private seed: number;
  private step: number;
  private frameCount = 0;
  private simNowMs = 0;
  private paused = false;
  private lastContext: StepContext | null = null;
  private flags: { friendlyFire?: boolean } = {};

  constructor(seed: number, step: number) {
    if (!step || step <= 0) {
      // Defensive default to avoid zero/negative timestep causing unexpected
      // behavior in stepping loops. Log to aid debugging.
      console.warn('[FixedStepDriver] initialized with invalid step:', step, '— defaulting to 1/60');
      step = 1 / 60;
    }
    this.seed = seed;
    this.step = step;
  }

  // Allow external callers to inject runtime flags (friendly-fire, debug modes, etc.)
  setFlags(flags: { friendlyFire?: boolean }) {
    this.flags = { ...this.flags, ...flags };
  }

  stepOnce(): StepContext {
    if (this.paused && this.lastContext) {
      return this.lastContext;
    }

    this.frameCount++;
    // Ensure simNowMs increments by a positive amount
    this.simNowMs += this.step * 1000;
    const rngSeed = stepSeed(this.seed, this.frameCount);
    const rng = createSeededRng(rngSeed);
    const context: StepContext = {
      frameCount: this.frameCount,
      simNowMs: this.simNowMs,
      rng,
      step: this.step,
      idFactory: createStepIdFactory({
        frameCount: this.frameCount,
        simNowMs: this.simNowMs,
      }),
      friendlyFire: this.flags.friendlyFire,
    };

    this.lastContext = context;
    return context;
  }

  pause(): PauseToken {
    this.paused = true;
    return { frameCount: this.frameCount, simNowMs: this.simNowMs };
  }

  resume(token?: PauseToken) {
    if (token) {
      this.frameCount = token.frameCount;
      this.simNowMs = token.simNowMs;
    }
    this.paused = false;
    this.lastContext = null;
  }

  reset(seed: number, step: number) {
    this.seed = seed;
    // Defensive guard for reset API too
    if (!step || step <= 0) {
      console.warn('[FixedStepDriver] reset called with invalid step:', step, '— defaulting to 1/60');
      step = 1 / 60;
    }
    this.step = step;
    this.frameCount = 0;
    this.simNowMs = 0;
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
