import { describe, it, expect } from "vitest";
import {
  clamp,
  wrapAngle,
  toCartesian,
  buildRightVector,
  buildForwardVector,
} from "../../../src/utils/cameraMath";
import type { Vector3 } from "../../../src/types";
import type { ArenaEntity } from "../../../src/ecs/entities/Arena";

describe("cameraMath", () => {
  describe("clamp", () => {
    it("should return value if within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("should return min if value < min", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("should return max if value > max", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should handle equal min and max", () => {
      expect(clamp(5, 5, 5)).toBe(5);
    });

    it("should handle negative ranges", () => {
      expect(clamp(-5, -10, -2)).toBe(-5);
      expect(clamp(-15, -10, -2)).toBe(-10);
      expect(clamp(0, -10, -2)).toBe(-2);
    });

    it("should handle decimal values", () => {
      expect(clamp(5.5, 5.0, 6.0)).toBe(5.5);
      expect(clamp(4.5, 5.0, 6.0)).toBe(5.0);
    });
  });

  describe("wrapAngle", () => {
    const TWO_PI = Math.PI * 2;

    it("should return angle if already in 0-2π range", () => {
      expect(wrapAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    });

    it("should wrap angles > 2π to 0-2π range", () => {
      expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
    });

    it("should wrap negative angles to 0-2π range", () => {
      const result = wrapAngle(-Math.PI / 2);
      expect(result).toBeCloseTo(Math.PI * 1.5);
    });

    it("should handle 0", () => {
      expect(wrapAngle(0)).toBe(0);
    });

    it("should handle 2π", () => {
      expect(wrapAngle(TWO_PI)).toBeCloseTo(0, 10);
    });

    it("should handle very large angles", () => {
      const result = wrapAngle(Math.PI * 10);
      expect(result).toBeCloseTo(0, 10);
    });

    it("should handle very negative angles", () => {
      const result = wrapAngle(-Math.PI * 5);
      expect(result).toBeCloseTo(Math.PI);
    });
  });

  describe("toCartesian", () => {
    const mockArena: ArenaEntity = {
      id: "arena-1",
      type: "Arena",
      boundaries: {
        min: { x: -50, y: 0, z: -50 },
        max: { x: 50, y: 100, z: 50 },
      },
    };

    it("should convert spherical to cartesian coordinates", () => {
      const target: Vector3 = { x: 0, y: 0, z: 0 };
      const spherical = {
        azimuth: 0,
        polar: Math.PI / 2,
        distance: 10,
      };

      const result = toCartesian(target, spherical, mockArena, 12);

      // At azimuth=0, polar=π/2, distance=10: should be roughly (0, 0, 10)
      expect(result.x).toBeCloseTo(0, { absolute: 0.1 });
      expect(result.z).toBeCloseTo(10, { absolute: 0.1 });
    });

    it("should clamp x/z coordinates within arena boundaries", () => {
      const target: Vector3 = { x: 0, y: 0, z: 0 };
      const spherical = {
        azimuth: 0,
        polar: Math.PI / 4,
        distance: 100, // Very large distance
      };

      const result = toCartesian(target, spherical, mockArena, 12);

      expect(result.x).toBeGreaterThanOrEqual(mockArena.boundaries.min.x);
      expect(result.x).toBeLessThanOrEqual(mockArena.boundaries.max.x);
      expect(result.z).toBeGreaterThanOrEqual(mockArena.boundaries.min.z);
      expect(result.z).toBeLessThanOrEqual(mockArena.boundaries.max.z);
    });

    it("should enforce minimum y height based on target", () => {
      const target: Vector3 = { x: 0, y: 5, z: 0 };
      const spherical = {
        azimuth: 0,
        polar: Math.PI / 2, // Polar pointing down
        distance: 50,
      };

      const result = toCartesian(target, spherical, mockArena, 12);

      // Should enforce minimum y = target.y + 5 = 10
      expect(result.y).toBeGreaterThanOrEqual(target.y + 5);
    });

    it("should respect minDistance parameter", () => {
      const target: Vector3 = { x: 0, y: 0, z: 0 };
      const spherical = {
        azimuth: 0,
        polar: Math.PI / 2,
        distance: 5, // Less than minDistance
      };

      const result = toCartesian(target, spherical, mockArena, 12);

      // Distance should be at least 12
      const dist = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2);
      expect(dist).toBeGreaterThanOrEqual(11.5); // Allow small floating point error
    });

    it("should handle spherical at azimuth 90 degrees", () => {
      const target: Vector3 = { x: 0, y: 0, z: 0 };
      const spherical = {
        azimuth: Math.PI / 2,
        polar: Math.PI / 2,
        distance: 10,
      };

      const result = toCartesian(target, spherical, mockArena, 12);

      // At azimuth=π/2, polar=π/2, distance=10: should be roughly (-10, 0, 0) or similar
      expect(Math.abs(result.x) + Math.abs(result.z)).toBeCloseTo(10, { absolute: 0.1 });
    });
  });

  describe("buildRightVector", () => {
    it("should build right vector at azimuth 0", () => {
      const right = buildRightVector(0);

      // At azimuth=0, right should point in negative z direction
      expect(right.x).toBeCloseTo(0, { absolute: 0.001 });
      expect(right.y).toBe(0);
      expect(right.z).toBeCloseTo(-1, { absolute: 0.001 });
    });

    it("should build right vector at azimuth π/2", () => {
      const right = buildRightVector(Math.PI / 2);

      // At azimuth=π/2, right should point in positive x direction
      expect(right.x).toBeCloseTo(1, { absolute: 0.001 });
      expect(right.y).toBe(0);
      expect(right.z).toBeCloseTo(0, { absolute: 0.001 });
    });

    it("should always have y = 0 (no vertical component)", () => {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const right = buildRightVector(angle);
        expect(right.y).toBe(0);
      }
    });

    it("should always be a unit vector", () => {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const right = buildRightVector(angle);
        const magnitude = Math.sqrt(right.x ** 2 + right.y ** 2 + right.z ** 2);
        expect(magnitude).toBeCloseTo(1, { absolute: 0.001 });
      }
    });
  });

  describe("buildForwardVector", () => {
    it("should build forward vector at azimuth 0", () => {
      const forward = buildForwardVector(0);

      // At azimuth=0, forward should point in positive z direction
      expect(forward.x).toBeCloseTo(0, { absolute: 0.001 });
      expect(forward.y).toBe(0);
      expect(forward.z).toBeCloseTo(1, { absolute: 0.001 });
    });

    it("should build forward vector at azimuth π/2", () => {
      const forward = buildForwardVector(Math.PI / 2);

      // At azimuth=π/2, forward should point in negative x direction
      expect(forward.x).toBeCloseTo(-1, { absolute: 0.001 });
      expect(forward.y).toBe(0);
      expect(forward.z).toBeCloseTo(0, { absolute: 0.001 });
    });

    it("should always have y = 0 (no vertical component)", () => {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const forward = buildForwardVector(angle);
        expect(forward.y).toBe(0);
      }
    });

    it("should always be a unit vector", () => {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const forward = buildForwardVector(angle);
        const magnitude = Math.sqrt(
          forward.x ** 2 +
            forward.y ** 2 +
            forward.z ** 2,
        );
        expect(magnitude).toBeCloseTo(1, { absolute: 0.001 });
      }
    });

    it("should be perpendicular to right vector", () => {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const right = buildRightVector(angle);
        const forward = buildForwardVector(angle);

        // Dot product should be approximately 0
        const dotProduct = right.x * forward.x + right.y * forward.y + right.z * forward.z;
        expect(dotProduct).toBeCloseTo(0, { absolute: 0.001 });
      }
    });
  });
});
