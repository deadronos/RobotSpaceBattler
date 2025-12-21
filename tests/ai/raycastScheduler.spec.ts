import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldRaycastThisFrame,
  createRaycastCache,
  type RaycastCache,
  type CachedResult,
} from '../../src/simulation/ai/pathing/raycastScheduler';

describe('shouldRaycastThisFrame', () => {
  describe('with default stagger interval (3)', () => {
    it('returns true for entity 0 on frames 0, 3, 6', () => {
      expect(shouldRaycastThisFrame(0, 0)).toBe(true);
      expect(shouldRaycastThisFrame(0, 3)).toBe(true);
      expect(shouldRaycastThisFrame(0, 6)).toBe(true);
    });

    it('returns false for entity 0 on frames 1, 2, 4, 5', () => {
      expect(shouldRaycastThisFrame(0, 1)).toBe(false);
      expect(shouldRaycastThisFrame(0, 2)).toBe(false);
      expect(shouldRaycastThisFrame(0, 4)).toBe(false);
      expect(shouldRaycastThisFrame(0, 5)).toBe(false);
    });

    it('returns true for entity 1 on frames 1, 4, 7', () => {
      expect(shouldRaycastThisFrame(1, 1)).toBe(true);
      expect(shouldRaycastThisFrame(1, 4)).toBe(true);
      expect(shouldRaycastThisFrame(1, 7)).toBe(true);
    });

    it('returns true for entity 2 on frames 2, 5, 8', () => {
      expect(shouldRaycastThisFrame(2, 2)).toBe(true);
      expect(shouldRaycastThisFrame(2, 5)).toBe(true);
      expect(shouldRaycastThisFrame(2, 8)).toBe(true);
    });

    it('handles entity IDs larger than stagger interval', () => {
      // Entity 3 should behave like entity 0 (3 % 3 === 0)
      expect(shouldRaycastThisFrame(3, 0)).toBe(true);
      expect(shouldRaycastThisFrame(3, 3)).toBe(true);
      // Entity 4 should behave like entity 1 (4 % 3 === 1)
      expect(shouldRaycastThisFrame(4, 1)).toBe(true);
      expect(shouldRaycastThisFrame(4, 4)).toBe(true);
    });
  });

  describe('with custom stagger interval', () => {
    it('works with interval of 2', () => {
      expect(shouldRaycastThisFrame(0, 0, 2)).toBe(true);
      expect(shouldRaycastThisFrame(0, 2, 2)).toBe(true);
      expect(shouldRaycastThisFrame(0, 1, 2)).toBe(false);
      expect(shouldRaycastThisFrame(1, 1, 2)).toBe(true);
      expect(shouldRaycastThisFrame(1, 3, 2)).toBe(true);
    });

    it('works with interval of 5', () => {
      expect(shouldRaycastThisFrame(0, 0, 5)).toBe(true);
      expect(shouldRaycastThisFrame(0, 5, 5)).toBe(true);
      expect(shouldRaycastThisFrame(3, 3, 5)).toBe(true);
      expect(shouldRaycastThisFrame(3, 8, 5)).toBe(true);
      expect(shouldRaycastThisFrame(3, 4, 5)).toBe(false);
    });

    it('interval of 1 means every frame', () => {
      expect(shouldRaycastThisFrame(0, 0, 1)).toBe(true);
      expect(shouldRaycastThisFrame(0, 1, 1)).toBe(true);
      expect(shouldRaycastThisFrame(5, 99, 1)).toBe(true);
    });
  });
});

describe('RaycastCache', () => {
  let cache: RaycastCache;

  beforeEach(() => {
    cache = createRaycastCache();
  });

  describe('get', () => {
    it('returns null for missing entries', () => {
      expect(cache.get(0)).toBeNull();
      expect(cache.get(999)).toBeNull();
    });
  });

  describe('set and get', () => {
    it('round-trips correctly', () => {
      const result: CachedResult = {
        avoidanceVector: { x: 1, y: 0, z: -1 },
        frameStamp: 42,
      };
      cache.set(5, result);
      expect(cache.get(5)).toEqual(result);
    });

    it('stores multiple entries independently', () => {
      const result1: CachedResult = {
        avoidanceVector: { x: 1, y: 0, z: 0 },
        frameStamp: 10,
      };
      const result2: CachedResult = {
        avoidanceVector: { x: 0, y: 1, z: 0 },
        frameStamp: 11,
      };
      cache.set(1, result1);
      cache.set(2, result2);
      expect(cache.get(1)).toEqual(result1);
      expect(cache.get(2)).toEqual(result2);
    });

    it('overwrites existing entry', () => {
      const result1: CachedResult = {
        avoidanceVector: { x: 1, y: 0, z: 0 },
        frameStamp: 10,
      };
      const result2: CachedResult = {
        avoidanceVector: { x: -1, y: 0, z: 0 },
        frameStamp: 13,
      };
      cache.set(1, result1);
      cache.set(1, result2);
      expect(cache.get(1)).toEqual(result2);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set(1, { avoidanceVector: { x: 1, y: 0, z: 0 }, frameStamp: 1 });
      cache.set(2, { avoidanceVector: { x: 0, y: 1, z: 0 }, frameStamp: 2 });
      cache.set(3, { avoidanceVector: { x: 0, y: 0, z: 1 }, frameStamp: 3 });

      cache.clear();

      expect(cache.get(1)).toBeNull();
      expect(cache.get(2)).toBeNull();
      expect(cache.get(3)).toBeNull();
    });
  });
});
