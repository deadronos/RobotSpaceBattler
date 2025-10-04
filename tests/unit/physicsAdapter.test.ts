import { describe, it, expect } from 'vitest';
import {
  callRaycast,
  callIntersectionsWithRay,
  callOverlapSphereEntities,
} from '../../src/utils/physicsAdapter';
import { extractEntityIdFromRapierHit } from '../../src/systems/rapierHelpers';

describe('physicsAdapter helpers', () => {
  it('callRaycast prefers adapter.raycast and returns its value', () => {
    const adapter = {
      raycast: (_origin: any, _dir: any, _max: number) => ({ targetId: 42, position: [1, 2, 3], normal: [0, 0, 0] }),
    };
    const res = callRaycast(adapter as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    expect(res).toEqual({ targetId: 42, position: [1, 2, 3], normal: [0, 0, 0] });
  });

  it('callRaycast returns raw TOI objects from Rapier world', () => {
    const world = {
      raycast: (_origin: any, _dir: any, _max: number) => ({ toi: 0.5 }),
    };
    const res = callRaycast(world as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    expect(res).toEqual({ toi: 0.5 });
  });

  it('callIntersectionsWithRay wraps adapter single-hit into array', () => {
    const adapter = {
      raycast: () => ({ targetId: 'x' }),
    };
    const out = callIntersectionsWithRay(adapter as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    expect(Array.isArray(out)).toBe(true);
    expect(out && out.length === 1).toBe(true);
  });

  it('callIntersectionsWithRay uses queryPipeline.intersectionsWithRay when available', () => {
    const world = {
      queryPipeline: {
        intersectionsWithRay: (_b: any, _c: any, _ray: any, _max: number, _solid: boolean, cb: (hit: any) => boolean) => {
          cb({ collider: { userData: { id: 99 } } });
        },
      },
      bodies: {},
      colliders: {},
    };
    const out = callIntersectionsWithRay(world as any, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 10);
    expect(out && out.length >= 1).toBe(true);
  });

  it('callOverlapSphereEntities prefers adapter.overlapSphereEntities', () => {
    const adapter = {
      overlapSphereEntities: (_center: any, _radius: any) => ['a', 'b'],
    };
    const out = callOverlapSphereEntities(adapter as any, { x: 0, y: 0, z: 0 }, 1);
    expect(out).toEqual(['a', 'b']);
  });

  it('callOverlapSphereEntities falls back to queryPipeline.intersectionsWithSphere and maps ids', () => {
    const world = {
      queryPipeline: {
        intersectionsWithSphere: (_b: any, _c: any, _center: any, _r: number, _solid: boolean, cb: (hit: any) => boolean) => {
          cb({ collider: { userData: { id: 123 } } });
        },
      },
      bodies: {},
      colliders: {},
    };

    const out = callOverlapSphereEntities(world as any, { x: 0, y: 0, z: 0 }, 1, extractEntityIdFromRapierHit);
    expect(out).toEqual(['123']);
  });
});
