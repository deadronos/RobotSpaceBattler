import { describe, it, expect } from 'vitest';
import { RNGManager, RNG_ALGORITHM_ID } from '../../src/systems/matchTrace/rngManager';

describe('RNGManager Basics', () => {
  it('should generate deterministic sequence with same seed', () => {
    const seed = 42;
    const rng1 = new RNGManager(seed);
    const rng2 = new RNGManager(seed);

    const sequence1: number[] = [];
    const sequence2: number[] = [];

    for (let i = 0; i < 100; i++) {
      sequence1.push(rng1.next());
      sequence2.push(rng2.next());
    }

    expect(sequence1).toEqual(sequence2);
  });

  it('should handle seed 0 by converting to 1', () => {
    const rng = new RNGManager(0);
    expect(rng.getSeed()).toBe(1);

    const val = rng.next();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it('should provide metadata for recording', () => {
    const rng = new RNGManager(12345);
    const metadata = rng.getMetadata();

    expect(metadata.rngSeed).toBe(12345);
    expect(metadata.rngAlgorithm).toBe(RNG_ALGORITHM_ID);
  });
});
