/**
 * Interface for a pseudo-random number generator.
 */
export interface RandomGenerator {
  /** The current seed state. */
  seed: number;
  /** Generates the next random number between 0 and 1. */
  next: () => number;
}

const UINT32_MAX = 0xffffffff;

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
      state = x >>> 0;
      return (state & UINT32_MAX) / (UINT32_MAX + 1);
    },
  };
}
