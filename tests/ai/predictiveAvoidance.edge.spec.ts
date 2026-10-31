import { describe, expect, it, vi } from "vitest";
import {
  computePredictiveAvoidance,
  DEFAULT_AVOIDANCE_CONFIG,
} from "../../src/simulation/ai/pathing/predictiveAvoidance";
import type {
  PhysicsQueryService,
  Vec3Like,
} from "../../src/simulation/ai/pathing/physicsQueryService";

/** Helper to create a mock PhysicsQueryService */
function createMockQueryService(
  castRayFanImpl: (
    origin: Vec3Like,
    directions: Vec3Like[],
    maxDistance: number,
    filterMask?: number,
  ) => Array<{ point: Vec3Like; normal: Vec3Like; distance: number } | null>,
): PhysicsQueryService {
  return {
    castRay: vi.fn<PhysicsQueryService["castRay"]>().mockReturnValue(null),
    castRayFan: vi.fn<PhysicsQueryService["castRayFan"]>(castRayFanImpl),
  };
}
describe("computePredictiveAvoidance", () => {
  describe("config overrides", () => {
    it("uses default config values", () => {
      expect(DEFAULT_AVOIDANCE_CONFIG.lookaheadDistance).toBe(5.0);
      expect(DEFAULT_AVOIDANCE_CONFIG.fanAngle).toBeCloseTo(Math.PI / 6, 5); // 30 degrees
      expect(DEFAULT_AVOIDANCE_CONFIG.avoidanceStrength).toBe(2.0);
    });

    it("custom lookahead distance is passed to castRayFan", () => {
      const service = createMockQueryService(() => [null, null, null]);

      computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service,
        { lookaheadDistance: 10.0 },
      );

      expect(service.castRayFan).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        10.0,
        expect.any(Number),
      );
    });

    it("custom fan angle affects ray directions", () => {
      const service = createMockQueryService(() => [null, null, null]);

      computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service,
        { fanAngle: Math.PI / 4 }, // 45 degrees
      );

      // Check that 3 directions were passed
      const directions = (service.castRayFan as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as Vec3Like[];
      expect(directions).toHaveLength(3);

      // Center ray should be forward (0, 0, 1)
      expect(directions[0].x).toBeCloseTo(0, 5);
      expect(directions[0].z).toBeCloseTo(1, 5);

      // Side rays should be at 45 degrees (cos(45) ≈ 0.707)
      expect(Math.abs(directions[1].x)).toBeCloseTo(Math.sin(Math.PI / 4), 2);
      expect(Math.abs(directions[2].x)).toBeCloseTo(Math.sin(Math.PI / 4), 2);
    });

    it("custom avoidance strength scales the result", () => {
      // Hit at distance 2.5 (50% weight with default 5 lookahead)
      const service = createMockQueryService(() => [
        {
          point: { x: 0, y: 0, z: 2.5 },
          normal: { x: 0, y: 0, z: -1 },
          distance: 2.5,
        },
        null,
        null,
      ]);

      const result1 = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service,
        { avoidanceStrength: 1.0 },
      );

      const result2 = computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service,
        { avoidanceStrength: 2.0 },
      );

      const mag1 = Math.sqrt(result1.x ** 2 + result1.y ** 2 + result1.z ** 2);
      const mag2 = Math.sqrt(result2.x ** 2 + result2.y ** 2 + result2.z ** 2);

      expect(mag2).toBeCloseTo(mag1 * 2, 2);
    });
  });

  describe("ray direction calculation", () => {
    it("generates 3 ray directions in a fan pattern", () => {
      const service = createMockQueryService(() => [null, null, null]);

      computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 1 },
        service,
      );

      const directions = (service.castRayFan as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as Vec3Like[];

      expect(directions).toHaveLength(3);

      // All directions should be normalized (length ≈ 1)
      for (const dir of directions) {
        const len = Math.sqrt(dir.x ** 2 + dir.y ** 2 + dir.z ** 2);
        expect(len).toBeCloseTo(1, 5);
      }
    });

    it("ray directions rotate correctly for non-forward velocity", () => {
      const service = createMockQueryService(() => [null, null, null]);

      // Moving in +X direction
      computePredictiveAvoidance(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        service,
      );

      const directions = (service.castRayFan as ReturnType<typeof vi.fn>).mock
        .calls[0][1] as Vec3Like[];

      // Center ray should be in +X direction
      expect(directions[0].x).toBeCloseTo(1, 5);
      expect(directions[0].z).toBeCloseTo(0, 5);
    });
  });
});
