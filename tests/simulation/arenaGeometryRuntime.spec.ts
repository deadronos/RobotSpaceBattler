import { describe, expect, it } from 'vitest';
import { vec3 } from '../../src/lib/math/vec3';
import { isLineOfSightBlockedRuntime } from '../../src/simulation/environment/arenaGeometry';

describe('isLineOfSightBlockedRuntime', () => {
  it('detects a blocking box-shaped obstacle using position + shape', () => {
    const start = vec3(-2, 0, 0);
    const end = vec3(2, 0, 0);

    const obstacle = {
      id: 'o1',
      blocksVision: true,
      active: true,
      position: { x: 0, y: 0, z: 0 },
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
    } as any;

    const blocked = isLineOfSightBlockedRuntime(start, end, { obstacles: [obstacle] });
    expect(blocked).toBe(true);
  });

  it('returns false when obstacle is inactive or not blocking vision', () => {
    // Pick a segment that does not intersect central static geometry so test exercises dynamic obstacle rules
    const start = vec3(-2, 0, 10);
    const end = vec3(2, 0, 10);

    const obstacle = { id: 'o2', blocksVision: true, active: false, position: { x: 0, y: 0, z: 0 }, shape: { kind: 'box', halfWidth: 1, halfDepth: 1 } } as any;
    expect(isLineOfSightBlockedRuntime(start, end, { obstacles: [obstacle] })).toBe(false);

    const obstacle2 = { id: 'o3', blocksVision: false, active: true, position: { x: 0, y: 0, z: 0 }, shape: { kind: 'box', halfWidth: 1, halfDepth: 1 } } as any;
    expect(isLineOfSightBlockedRuntime(start, end, { obstacles: [obstacle2] })).toBe(false);
  });
});
