import { describe, expect, it } from 'vitest';

import { lerpVector } from '../../../src/utils/math';

describe('math utils', () => {
  it('linearly interpolates between vectors', () => {
    const start = { x: 0, y: 0, z: 0 };
    const end = { x: 10, y: -5, z: 2 };

    const result = lerpVector(start, end, 0.25);

    expect(result).toEqual({ x: 2.5, y: -1.25, z: 0.5 });
  });
});
