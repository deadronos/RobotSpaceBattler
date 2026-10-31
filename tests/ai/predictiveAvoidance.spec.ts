import { describe, expect, it, vi } from 'vitest';
import { CollisionGroup } from '../../src/lib/physics/collisionGroups';
import { computePredictiveAvoidance } from '../../src/simulation/ai/pathing/predictiveAvoidance';
import type { PhysicsQueryService, Vec3Like } from '../../src/simulation/ai/pathing/physicsQueryService';

/** Helper to create a mock PhysicsQueryService */
function createMockQueryService(
  castRayFanImpl: (
    origin: Vec3Like,
    directions: Vec3Like[],
    maxDistance: number,
    filterMask?: number
  ) => Array<{ point: Vec3Like; normal: Vec3Like; distance: number } | null>
): PhysicsQueryService {
  return {
    castRay: vi.fn().mockReturnValue(null),
    castRayFan: vi.fn(castRayFanImpl),
  };
}
describe('computePredictiveAvoidance', () => {
  describe('zero/near-zero velocity', () => {
    it('returns zero vector when velocity is zero', () => {
      const service = createMockQueryService(() => [null, null, null]);
      const result = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0 },
        service
      );

      expect(result).toEqual({ x: 0, y: 0, z: 0 });
      // castRayFan should not be called if velocity is zero
      expect(service.castRayFan).not.toHaveBeenCalled();
    });

    it('returns zero vector when velocity is near-zero', () => {
      const service = createMockQueryService(() => [null, null, null]);
      const result = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0.0001, y: 0, z: 0.0001 },
        service
      );

      expect(result).toEqual({ x: 0, y: 0, z: 0 });
      expect(service.castRayFan).not.toHaveBeenCalled();
    });
  });

  describe('no hits (clear path)', () => {
    it('returns zero vector when no rays hit anything', () => {
      const service = createMockQueryService(() => [null, null, null]);
      const result = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service
      );

      expect(result).toEqual({ x: 0, y: 0, z: 0 });
      expect(service.castRayFan).toHaveBeenCalled();
    });
  });

  describe('forward ray hit', () => {
    it('returns avoidance vector perpendicular to forward ray when center ray hits', () => {
      // Hit on center ray at distance 2 (out of 5)
      const service = createMockQueryService(() => [
        { point: { x: 0, y: 0, z: 2 }, normal: { x: 0, y: 0, z: -1 }, distance: 2 },
        null,
        null,
      ]);

      const result = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service
      );

      // Avoidance should be non-zero and perpendicular to forward
      expect(result.z).toBeCloseTo(0, 2);
      // Should have some lateral (x) component for avoidance
      expect(Math.abs(result.x) > 0 || Math.abs(result.y) > 0).toBe(true);
    });
  });

  describe('side ray hits', () => {
    it('returns avoidance vector when left ray hits', () => {
      // Only left ray hits
      const service = createMockQueryService(() => [
        null,
        { point: { x: -2, y: 0, z: 2 }, normal: { x: 1, y: 0, z: 0 }, distance: 3 },
        null,
      ]);

      const result = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service
      );

      // Should steer away from left (positive x)
      expect(result.x).toBeGreaterThan(0);
    });

    it('returns avoidance vector when right ray hits', () => {
      // Only right ray hits
      const service = createMockQueryService(() => [
        null,
        null,
        { point: { x: 2, y: 0, z: 2 }, normal: { x: -1, y: 0, z: 0 }, distance: 3 },
      ]);

      const result = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service
      );

      // Should steer away from right (negative x)
      expect(result.x).toBeLessThan(0);
    });
  });

  describe('distance-based weight', () => {
    it('closer hits produce stronger avoidance', () => {
      // Close hit at distance 1
      const closeService = createMockQueryService(() => [
        { point: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 0, z: -1 }, distance: 1 },
        null,
        null,
      ]);

      // Far hit at distance 4
      const farService = createMockQueryService(() => [
        { point: { x: 0, y: 0, z: 4 }, normal: { x: 0, y: 0, z: -1 }, distance: 4 },
        null,
        null,
      ]);

      const closeResult = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        closeService
      );

      const farResult = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        farService
      );

      // Close hit should have larger magnitude than far hit
      const closeMag = Math.sqrt(
        closeResult.x ** 2 + closeResult.y ** 2 + closeResult.z ** 2
      );
      const farMag = Math.sqrt(
        farResult.x ** 2 + farResult.y ** 2 + farResult.z ** 2
      );

      expect(closeMag).toBeGreaterThan(farMag);
    });
  });

  describe('collision group filtering', () => {
    it('uses STATIC_GEOMETRY collision group for filtering', () => {
      const service = createMockQueryService(() => [null, null, null]);

      computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service
      );

      expect(service.castRayFan).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.any(Number),
        CollisionGroup.STATIC_GEOMETRY
      );
    });
  });
});
