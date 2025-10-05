import { describe, it, expect } from 'vitest';
import { stableHash, stableStringify } from '../../src/utils/hash';
import { callIntersectionsWithRay } from '../../src/utils/physicsAdapter';

describe('stable hash utilities', () => {
  it('produces same hash for objects with same keys in different orders', () => {
    const a = { a: 1, b: 2, nested: { x: 9, y: 8 } };
    const b = { b: 2, nested: { y: 8, x: 9 }, a: 1 };
    expect(stableStringify(a)).toEqual(stableStringify(b));
    expect(stableHash(a)).toEqual(stableHash(b));
  });

  it('returns a hex-like string', () => {
    const h = stableHash({ foo: 'bar' });
    expect(typeof h).toBe('string');
    expect(h.startsWith('0x')).toBe(true);
    expect(h.length).toBeGreaterThan(3);
  });
});

describe('callIntersectionsWithRay deterministic ordering', () => {
  it('returns the same ordered array regardless of callback order (no toi)', () => {
    const hitA = { collider: { userData: { id: 1 } }, position: { x: 0, y: 0, z: 0 } };
    const hitB = { collider: { userData: { id: 2 } }, position: { x: 1, y: 0, z: 0 } };

    const makeWorld = (order: Array<any>) => ({
      queryPipeline: {
        intersectionsWithRay: (_bodies: unknown, _colliders: unknown, _ray: unknown, _maxToi: number, _flags: unknown, cb: (h: unknown) => boolean) => {
          for (const h of order) cb(h);
        },
      },
      bodies: {},
      colliders: {},
    });

    const world1 = makeWorld([hitA, hitB]);
    const world2 = makeWorld([hitB, hitA]);

    const out1 = callIntersectionsWithRay(world1 as unknown as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    const out2 = callIntersectionsWithRay(world2 as unknown as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);

    expect(Array.isArray(out1)).toBe(true);
    expect(Array.isArray(out2)).toBe(true);
    // The sorted outputs should be deeply equal and deterministic
    expect(JSON.stringify(out1)).toEqual(JSON.stringify(out2));
  });

  it('prefers numeric toi ordering when present', () => {
    const hitA = { toi: 5, collider: { userData: { id: 1 } } };
    const hitB = { toi: 2, collider: { userData: { id: 2 } } };
    const makeWorld = (order: Array<any>) => ({
      queryPipeline: {
        intersectionsWithRay: (_bodies: unknown, _colliders: unknown, _ray: unknown, _maxToi: number, _flags: unknown, cb: (h: unknown) => boolean) => {
          for (const h of order) cb(h);
        },
      },
      bodies: {},
      colliders: {},
    });

    const world = makeWorld([hitA, hitB]);
    const out = callIntersectionsWithRay(world as unknown as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    expect(Array.isArray(out)).toBe(true);
    // Should be ordered by toi ascending
    const parsed = out as Array<Record<string, unknown>>;
    expect((parsed[0]['toi'] as number)).toBeLessThan((parsed[1]['toi'] as number));
  });
});
