import { describe, it, expect, beforeEach } from 'vitest';
import { PathCache } from '@/simulation/ai/pathfinding/search/PathCache';
import type { NavigationPath } from '@/simulation/ai/pathfinding/types';

describe('PathCache', () => {
  let cache: PathCache;

  beforeEach(() => {
    cache = new PathCache({ maxSize: 100 });
  });

  it('T050: PathCache achieves >80% hit rate for repeated queries', () => {
    // Arrange: Create a set of common start/target pairs
    const commonPairs = [
      { start: { x: 10, y: 0, z: 10 }, target: { x: 80, y: 0, z: 80 } },
      { start: { x: 20, y: 0, z: 20 }, target: { x: 70, y: 0, z: 70 } },
      { start: { x: 30, y: 0, z: 30 }, target: { x: 60, y: 0, z: 60 } },
      { start: { x: 40, y: 0, z: 40 }, target: { x: 50, y: 0, z: 50 } },
      { start: { x: 15, y: 0, z: 15 }, target: { x: 75, y: 0, z: 75 } },
    ];

    const mockPath: NavigationPath = {
      waypoints: [{ x: 0, y: 0, z: 0 }, { x: 50, y: 0, z: 50 }, { x: 100, y: 0, z: 100 }],
      totalDistance: 100,
      smoothed: true,
    };

    // Prime the cache with common paths
    commonPairs.forEach(({ start, target }) => {
      cache.set(start, target, mockPath);
    });

    // Act: Simulate realistic usage pattern (85% repeated, 15% new queries for >80% hit rate)
    let hits = 0;
    let misses = 0;
    const totalQueries = 100;

    for (let i = 0; i < totalQueries; i++) {
      let start, target;
      
      if (i % 100 < 85) {
        // 85% of queries: use common paths (should hit after first query)
        const pairIndex = i % commonPairs.length;
        const pair = commonPairs[pairIndex];
        start = pair.start;
        target = pair.target;
      } else {
        // 15% of queries: use new paths (will miss)
        start = { x: Math.random() * 100, y: 0, z: Math.random() * 100 };
        target = { x: Math.random() * 100, y: 0, z: Math.random() * 100 };
      }

      const result = cache.get(start, target);
      if (result) {
        hits++;
      } else {
        misses++;
        // Cache the new path
        cache.set(start, target, mockPath);
      }
    }

    const hitRate = hits / totalQueries;

    // Assert: Hit rate should be >80%
    expect(hitRate).toBeGreaterThan(0.8);
    
    // Verify cache statistics
    const stats = cache.getStats();
    expect(stats.hitRate).toBeGreaterThan(0.8);
    expect(stats.size).toBeLessThanOrEqual(100); // Within max size
  });

  it('should evict least recently used entries when cache is full', () => {
    // Arrange: Create cache with small size
    const smallCache = new PathCache({ maxSize: 3 });
    const mockPath: NavigationPath = {
      waypoints: [{ x: 0, y: 0, z: 0 }],
      totalDistance: 10,
      smoothed: false,
    };

    // Act: Add 4 entries (should evict oldest)
    smallCache.set({ x: 1, y: 0, z: 1 }, { x: 10, y: 0, z: 10 }, mockPath);
    smallCache.set({ x: 2, y: 0, z: 2 }, { x: 20, y: 0, z: 20 }, mockPath);
    smallCache.set({ x: 3, y: 0, z: 3 }, { x: 30, y: 0, z: 30 }, mockPath);
    smallCache.set({ x: 4, y: 0, z: 4 }, { x: 40, y: 0, z: 40 }, mockPath); // Should evict entry 1

    // Assert: First entry should be evicted
    const first = smallCache.get({ x: 1, y: 0, z: 1 }, { x: 10, y: 0, z: 10 });
    expect(first).toBeNull();

    // Other entries should still exist
    const second = smallCache.get({ x: 2, y: 0, z: 2 }, { x: 20, y: 0, z: 20 });
    expect(second).not.toBeNull();

    const stats = smallCache.getStats();
    expect(stats.size).toBe(3);
  });

  it('should generate consistent cache keys for equivalent positions', () => {
    const mockPath: NavigationPath = {
      waypoints: [{ x: 0, y: 0, z: 0 }],
      totalDistance: 10,
      smoothed: false,
    };

    // Set with one position
    cache.set({ x: 10.5, y: 0, z: 20.5 }, { x: 80.5, y: 0, z: 90.5 }, mockPath);

    // Get with equivalent position (should hit)
    const result = cache.get({ x: 10.5, y: 0, z: 20.5 }, { x: 80.5, y: 0, z: 90.5 });
    expect(result).not.toBeNull();
    expect(result?.waypoints).toEqual(mockPath.waypoints);
  });

  it('should clear cache on invalidation', () => {
    const mockPath: NavigationPath = {
      waypoints: [{ x: 0, y: 0, z: 0 }],
      totalDistance: 10,
      smoothed: false,
    };

    // Add entries
    cache.set({ x: 10, y: 0, z: 10 }, { x: 80, y: 0, z: 80 }, mockPath);
    cache.set({ x: 20, y: 0, z: 20 }, { x: 70, y: 0, z: 70 }, mockPath);

    // Invalidate
    cache.invalidateAll();

    // Verify cache is empty
    const result = cache.get({ x: 10, y: 0, z: 10 }, { x: 80, y: 0, z: 80 });
    expect(result).toBeNull();

    const stats = cache.getStats();
    expect(stats.size).toBe(0);
  });
});
