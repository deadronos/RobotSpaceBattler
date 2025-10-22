export interface RngState {
  seed: number;
}

export function createRng(seed: number): () => number {
  let state: RngState = { seed: seed >>> 0 };

  return () => {
    let x = state.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    state = { seed: x >>> 0 };
    return (state.seed & 0xffffffff) / 0x100000000;
  };
}
