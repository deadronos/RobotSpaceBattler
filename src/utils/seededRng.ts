/**
 * Seeded pseudo-random number generator using the Mulberry32 algorithm.
 * Returns numbers in the range [0, 1).
 */
export type Rng = () => number;

export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0;
  return function () {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
