import { describe, it, expect } from 'vitest';
import { createDefaultMovementPattern } from '../../../src/ecs/components/movementPattern';

describe('MovementPattern component factory', () => {
  it('returns a sensible default movement pattern', () => {
    const p = createDefaultMovementPattern();

    expect(p.patternType).toBe('linear');
    expect(Array.isArray(p.points)).toBe(true);
    expect(p.speed).toBeGreaterThan(0);
    expect(typeof p.loop).toBe('boolean');
    expect(p.phase).toBe(0);
  });
});
