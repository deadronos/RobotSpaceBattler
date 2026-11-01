export interface FixedStepperOptions {
  /** Fixed simulation step length in seconds (e.g. 1/60). */
  stepSeconds: number;
  /** Maximum number of steps executed per advance() call. */
  maxSubSteps: number;
}

export interface FixedStepper {
  /**
   * Accumulates a variable frame delta and runs `step` zero or more times with
   * the fixed step length. If the delta needs more than `maxSubSteps` steps the
   * excess backlog is dropped (the sim slows down instead of spiralling).
   *
   * @returns The number of steps executed.
   */
  advance: (frameDeltaSeconds: number, step: (dt: number) => void) => number;
  /** Clears any accumulated time. */
  reset: () => void;
}

// Tolerance so that e.g. 60 frames of 1/60 s yield exactly 60 steps despite
// floating point drift in the accumulator.
const EPSILON = 1e-9;

/**
 * Creates a fixed-timestep accumulator with a max-substeps clamp.
 */
export function createFixedStepper(options: FixedStepperOptions): FixedStepper {
  const { stepSeconds, maxSubSteps } = options;
  let accumulator = 0;

  return {
    advance: (frameDeltaSeconds, step) => {
      if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds <= 0) {
        return 0;
      }
      accumulator += frameDeltaSeconds;

      let steps = 0;
      while (accumulator + EPSILON >= stepSeconds && steps < maxSubSteps) {
        step(stepSeconds);
        accumulator -= stepSeconds;
        steps += 1;
      }

      if (accumulator + EPSILON >= stepSeconds) {
        // Cap hit: discard the backlog rather than carrying it forward.
        accumulator = 0;
      } else if (accumulator < 0) {
        accumulator = 0;
      }
      return steps;
    },
    reset: () => {
      accumulator = 0;
    },
  };
}
