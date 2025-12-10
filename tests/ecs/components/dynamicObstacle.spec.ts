import { describe, it, expect } from 'vitest';
import { createDefaultDynamicObstacle } from '../../../src/ecs/components/dynamicObstacle';

describe('DynamicObstacle factory', () => {
  it('produces an obstacle with expected default fields', () => {
    const o = createDefaultDynamicObstacle();

    expect(typeof o.id).toBe('string');
    expect(o.kind).toBe('obstacle');
    expect(o.obstacleType).toBe('barrier');
    expect(Array.isArray(o.position)).toBe(false);
    expect(o.blocksVision).toBeTruthy();
    expect(o.blocksMovement).toBeTruthy();
  });
});
