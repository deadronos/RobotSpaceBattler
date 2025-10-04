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

export function createStepIdFactory(options: {
  frameCount: number;
  simNowMs: number;
  prefix?: string;
}): () => string {
  let seq = 0;
  const base = options.prefix ? `${options.prefix}-` : "";
  return () => `${base}${options.frameCount}-${options.simNowMs}-${seq++}`;
}

export function shuffleInPlace<T>(items: T[], rng: Rng) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}
