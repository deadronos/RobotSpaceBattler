import { describe, expect, it } from 'vitest';
import {
  closestPointOnAABB,
  closestPointOnCircle,
  distanceSquaredPointToAABB,
  distanceSquaredPointToCircle,
  isPointInAABB,
  isPointInCircle,
  distanceSquaredXZ,
  segmentIntersectsAABB,
  segmentIntersectsCircle,
  distanceSquaredPointToPolygon,
} from '../../../src/lib/math/geometry';
import { vec3 } from '../../../src/lib/math/vec3';

describe('geometry', () => {
  describe('closestPointOnAABB', () => {
    const center = vec3(10, 0, 10);
    const halfWidth = 5; // x range: [5, 15]
    const halfDepth = 5; // z range: [5, 15]

    it('returns the point itself if inside the AABB', () => {
      const point = vec3(10, 0, 10);
      const result = closestPointOnAABB(point, center, halfWidth, halfDepth);
      expect(result).toEqual(point);
    });

    it('clamps x coordinate when outside on left', () => {
      const point = vec3(0, 0, 10);
      const result = closestPointOnAABB(point, center, halfWidth, halfDepth);
      expect(result).toEqual(vec3(5, 0, 10));
    });

    it('clamps x coordinate when outside on right', () => {
      const point = vec3(20, 0, 10);
      const result = closestPointOnAABB(point, center, halfWidth, halfDepth);
      expect(result).toEqual(vec3(15, 0, 10));
    });

    it('clamps z coordinate when outside on top', () => {
      const point = vec3(10, 0, 0);
      const result = closestPointOnAABB(point, center, halfWidth, halfDepth);
      expect(result).toEqual(vec3(10, 0, 5));
    });

    it('clamps both coordinates (corner case)', () => {
      const point = vec3(0, 0, 0);
      const result = closestPointOnAABB(point, center, halfWidth, halfDepth);
      expect(result).toEqual(vec3(5, 0, 5));
    });
  });

  describe('distanceSquaredPointToAABB', () => {
    const center = vec3(0, 0, 0);
    const halfWidth = 1;
    const halfDepth = 1;

    it('returns 0 if point is inside', () => {
      expect(distanceSquaredPointToAABB(vec3(0.5, 0, 0.5), center, halfWidth, halfDepth)).toBe(0);
    });

    it('returns squared distance if outside', () => {
      // Closest point to (2, 0, 0) is (1, 0, 0). Dist is 1. SqDist is 1.
      expect(distanceSquaredPointToAABB(vec3(2, 0, 0), center, halfWidth, halfDepth)).toBe(1);
    });
  });

  describe('closestPointOnCircle', () => {
    const center = vec3(0, 0, 0);
    const radius = 5;

    it('returns point itself if inside', () => {
      const point = vec3(1, 0, 1);
      const result = closestPointOnCircle(point, center, radius);
      expect(result).toEqual(point);
    });

    it('projects point to perimeter if outside', () => {
      const point = vec3(10, 0, 0);
      const result = closestPointOnCircle(point, center, radius);
      expect(result.x).toBeCloseTo(5);
      expect(result.z).toBeCloseTo(0);
    });

    it('handles center point edge case', () => {
      const point = vec3(0, 0, 0);
      const result = closestPointOnCircle(point, center, radius);
      // If at center, it should project to *somewhere* on edge or remain at center?
      // My implementation returns center + radius (so x=5, z=0)
      expect(result.x).toBe(5);
    });
  });

  describe('distanceSquaredPointToCircle', () => {
    const center = vec3(0, 0, 0);
    const radius = 5;

    it('returns 0 if inside', () => {
      expect(distanceSquaredPointToCircle(vec3(1, 0, 1), center, radius)).toBe(0);
    });

    it('returns squared distance to perimeter if outside', () => {
      const point = vec3(8, 0, 4); // dist from origin = sqrt(64+16) = sqrt(80) ≈ 8.94
      // radius = 5
      // dist to perimeter = sqrt(80) - 5
      // sqDist = (sqrt(80)-5)^2
      const val = Math.sqrt(80) - 5;
      expect(distanceSquaredPointToCircle(point, center, radius)).toBeCloseTo(val * val);
    });
  });

  describe('isPointInAABB', () => {
    const center = vec3(10, 0, 10);
    const halfWidth = 5;
    const halfDepth = 5;

    it('returns true if inside', () => {
      expect(isPointInAABB(vec3(10, 0, 10), center, halfWidth, halfDepth)).toBe(true);
      expect(isPointInAABB(vec3(5, 0, 5), center, halfWidth, halfDepth)).toBe(true);
      expect(isPointInAABB(vec3(15, 0, 15), center, halfWidth, halfDepth)).toBe(true);
    });

    it('returns false if outside', () => {
      expect(isPointInAABB(vec3(0, 0, 0), center, halfWidth, halfDepth)).toBe(false);
      expect(isPointInAABB(vec3(16, 0, 10), center, halfWidth, halfDepth)).toBe(false);
    });
  });

  describe('isPointInCircle', () => {
    const center = vec3(0, 0, 0);
    const radius = 5;

    it('returns true if inside', () => {
      expect(isPointInCircle(vec3(0, 0, 0), center, radius)).toBe(true);
      expect(isPointInCircle(vec3(3, 0, 4), center, radius)).toBe(true); // 3^2+4^2 = 25
    });

    it('returns false if outside', () => {
      expect(isPointInCircle(vec3(6, 0, 0), center, radius)).toBe(false);
    });
  });

  describe('distanceSquaredXZ', () => {
    it('calculates squared distance in XZ plane', () => {
      const p1 = vec3(0, 10, 0);
      const p2 = vec3(3, 20, 4);
      expect(distanceSquaredXZ(p1, p2)).toBe(25); // 3^2 + 4^2
    });
  });

  describe('segmentIntersectsAABB', () => {
    const center = vec3(0, 0, 0);
    const halfWidth = 2;
    const halfDepth = 2;

    it('returns true if segment passes through AABB', () => {
      const start = vec3(-4, 0, 0);
      const end = vec3(4, 0, 0);
      expect(segmentIntersectsAABB(start, end, center, halfWidth, halfDepth)).toBe(true);
    });

    it('returns false if segment is outside', () => {
      const start = vec3(-4, 0, 4);
      const end = vec3(4, 0, 4);
      expect(segmentIntersectsAABB(start, end, center, halfWidth, halfDepth)).toBe(false);
    });
  });

  describe('segmentIntersectsCircle', () => {
    const center = vec3(0, 0, 0);
    const radius = 2;

    it('returns true if segment passes through circle', () => {
      const start = vec3(-4, 0, 0);
      const end = vec3(4, 0, 0);
      expect(segmentIntersectsCircle(start, end, center, radius)).toBe(true);
    });

    it('returns false if segment is outside', () => {
      const start = vec3(-4, 0, 4);
      const end = vec3(4, 0, 4);
      expect(segmentIntersectsCircle(start, end, center, radius)).toBe(false);
    });
  });

  describe('distanceSquaredPointToPolygon', () => {
    const vertices = [
      vec3(0, 0, 0),
      vec3(10, 0, 0),
      vec3(10, 0, 10),
      vec3(0, 0, 10),
    ];

    it('returns 0 if inside', () => {
      expect(distanceSquaredPointToPolygon(vec3(5, 0, 5), vertices)).toBe(0);
    });

    it('returns squared distance to closest edge if outside', () => {
      expect(distanceSquaredPointToPolygon(vec3(-2, 0, 5), vertices)).toBe(4);
    });
  });
});
