export interface RandomGenerator {
  seed: number;
  next: () => number;
}

const UINT32_MAX = 0xffffffff;

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
