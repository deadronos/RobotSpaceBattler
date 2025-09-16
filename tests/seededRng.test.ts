import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../src/utils/seededRng';

describe('createSeededRng', () => {
  it('produces deterministic sequences', () => {
    const rngA = createSeededRng(123);
    const rngB = createSeededRng(123);
    const seqA = [rngA(), rngA(), rngA()];
    const seqB = [rngB(), rngB(), rngB()];
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    const rngA = createSeededRng(1);
    const rngB = createSeededRng(2);
    expect(rngA()).not.toBe(rngB());
  });
});
