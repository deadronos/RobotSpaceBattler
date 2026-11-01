/**
 * Interface for a pseudo-random number generator.
 */
export interface RandomGenerator {
  /** The current seed state. */
  seed: number;
  /** Generates the next random number between 0 and 1. */
  next: () => number;
}

// 2^32: the number of distinct uint32 outputs, used to map a state to [0, 1).
const UINT32_RANGE = 0x100000000;

/**
 * Creates a XorShift32 pseudo-random number generator.
 * This is a fast, non-cryptographic PRNG suitable for game logic.
 *
 * @param seed - The initial seed value.
 * @returns A RandomGenerator object.
 */
export function createXorShift32(seed: number): RandomGenerator {
  let state = seed >>> 0;
  if (state === 0) {
    state = 0x1a2b3c4d;
  }

  return {
    seed: state,
    next: () => {
      let x = state;
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      // `>>> 0` keeps the value unsigned: the previous `& 0xffffffff`
      // coerced to int32, so half of the outputs were negative and every
      // consumer of next() (spawn jitter, strafe signs, AI rolls) was skewed.
      state = x >>> 0;
      return state / UINT32_RANGE;
    },
  };
}
