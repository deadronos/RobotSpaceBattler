import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPhysicsQueryService,
  PhysicsQueryService,
  RaycastHit,
} from '../../src/simulation/ai/pathing/physicsQueryService';

describe('PhysicsQueryService', () => {
  describe('with null/undefined world', () => {
    it('castRay returns null when world is null', () => {
      const service = createPhysicsQueryService(null);
      const result = service.castRay(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        10
      );
      expect(result).toBeNull();
    });

    it('castRay returns null when world is undefined', () => {
      const service = createPhysicsQueryService(undefined);
      const result = service.castRay(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        10
      );
      expect(result).toBeNull();
    });

    it('castRayFan returns array of nulls when world is null', () => {
      const service = createPhysicsQueryService(null);
      const directions = [
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ];
      const results = service.castRayFan(
        { x: 0, y: 0, z: 0 },
        directions,
        10
      );
      expect(results).toHaveLength(3);
      expect(results.every((r) => r === null)).toBe(true);
    });

    it('castRayFan returns array of nulls when world is undefined', () => {
      const service = createPhysicsQueryService(undefined);
      const directions = [
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 0 },
      ];
      const results = service.castRayFan(
        { x: 0, y: 0, z: 0 },
        directions,
        5
      );
      expect(results).toHaveLength(2);
      expect(results.every((r) => r === null)).toBe(true);
    });
  });

  describe('with mocked Rapier world', () => {
    let mockWorld: {
      castRay: ReturnType<typeof vi.fn>;
    };
    let service: PhysicsQueryService;

    beforeEach(() => {
      mockWorld = {
        castRay: vi.fn(),
      };
    });

    it('castRay returns RaycastHit when world returns a hit', () => {
      mockWorld.castRay.mockReturnValue({
        timeOfImpact: 5.0,
        normal: { x: 0, y: 0, z: -1 },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service = createPhysicsQueryService(mockWorld as any);

      const result = service.castRay(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        10
      );

      expect(result).not.toBeNull();
      expect(result!.distance).toBe(5.0);
      expect(result!.normal).toEqual({ x: 0, y: 0, z: -1 });
      // Point should be origin + direction * distance
      expect(result!.point).toEqual({ x: 0, y: 0, z: 5 });
    });

    it('castRay returns null when world returns no hit', () => {
      mockWorld.castRay.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service = createPhysicsQueryService(mockWorld as any);

      const result = service.castRay(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        10
      );

      expect(result).toBeNull();
    });

    it('castRay passes correct parameters to Rapier world', () => {
      mockWorld.castRay.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service = createPhysicsQueryService(mockWorld as any);

      service.castRay(
        { x: 1, y: 2, z: 3 },
        { x: 0, y: 0, z: 1 },
        15,
        0x00040003 // filterMask
      );

      expect(mockWorld.castRay).toHaveBeenCalledTimes(1);

      const [ray, maxToi, solid, filterGroups] = mockWorld.castRay.mock.calls[0];

      // Check ray origin and direction
      expect(ray.origin).toEqual({ x: 1, y: 2, z: 3 });
      expect(ray.dir).toEqual({ x: 0, y: 0, z: 1 });
      expect(maxToi).toBe(15);
      expect(solid).toBe(true);
      expect(filterGroups).toBe(0x00040003);
    });

    it('castRayFan returns array of hits for multiple directions', () => {
      mockWorld.castRay
        .mockReturnValueOnce({
          timeOfImpact: 3.0,
          normal: { x: 0, y: 0, z: -1 },
        })
        .mockReturnValueOnce(null) // Second ray misses
        .mockReturnValueOnce({
          timeOfImpact: 7.0,
          normal: { x: -1, y: 0, z: 0 },
        });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service = createPhysicsQueryService(mockWorld as any);

      const directions = [
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ];

      const results = service.castRayFan(
        { x: 0, y: 0, z: 0 },
        directions,
        10
      );

      expect(results).toHaveLength(3);

      // First hit
      expect(results[0]).not.toBeNull();
      expect(results[0]!.distance).toBe(3.0);
      expect(results[0]!.point).toEqual({ x: 0, y: 0, z: 3 });

      // Second miss
      expect(results[1]).toBeNull();

      // Third hit
      expect(results[2]).not.toBeNull();
      expect(results[2]!.distance).toBe(7.0);
      expect(results[2]!.point).toEqual({ x: -7, y: 0, z: 0 });
    });

    it('castRayFan passes filterMask to all rays', () => {
      mockWorld.castRay.mockReturnValue(null);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service = createPhysicsQueryService(mockWorld as any);

      const directions = [
        { x: 0, y: 0, z: 1 },
        { x: 1, y: 0, z: 0 },
      ];

      service.castRayFan(
        { x: 0, y: 0, z: 0 },
        directions,
        10,
        0x00010001
      );

      expect(mockWorld.castRay).toHaveBeenCalledTimes(2);

      // Both calls should have same filterGroups
      const [, , , filterGroups1] = mockWorld.castRay.mock.calls[0];
      const [, , , filterGroups2] = mockWorld.castRay.mock.calls[1];

      expect(filterGroups1).toBe(0x00010001);
      expect(filterGroups2).toBe(0x00010001);
    });

    it('castRayFan returns empty array for empty directions', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service = createPhysicsQueryService(mockWorld as any);

      const results = service.castRayFan(
        { x: 0, y: 0, z: 0 },
        [],
        10
      );

      expect(results).toHaveLength(0);
      expect(mockWorld.castRay).not.toHaveBeenCalled();
    });
  });

  describe('interface types', () => {
    it('RaycastHit has correct shape', () => {
      const hit: RaycastHit = {
        point: { x: 1, y: 2, z: 3 },
        normal: { x: 0, y: 1, z: 0 },
        distance: 5.5,
      };

      expect(hit.point.x).toBe(1);
      expect(hit.normal.y).toBe(1);
      expect(hit.distance).toBe(5.5);
    });
  });
});
