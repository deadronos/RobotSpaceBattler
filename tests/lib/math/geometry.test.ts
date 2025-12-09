import { describe, expect, it } from 'vitest';
import {
  closestPointOnAABB,
  closestPointOnCircle,
  distanceSquaredPointToAABB,
  distanceSquaredPointToCircle,
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
});
