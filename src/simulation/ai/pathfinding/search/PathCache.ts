/**
 * LRU (Least Recently Used) cache for pathfinding results
 * Improves performance by caching frequently requested paths
 */

import type { NavigationPath, Point3D } from '../types';

interface CacheEntry {
  path: NavigationPath;
  timestamp: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

interface PathCacheOptions {
  maxSize: number;
}

/**
 * Generates a cache key from start and target positions
 * Uses grid quantization to allow nearby positions to share cache entries
 */
function generateCacheKey(start: Point3D, target: Point3D, gridSize = 0.5): string {
  const quantize = (value: number) => Math.round(value / gridSize) * gridSize;
  return `${quantize(start.x)},${quantize(start.z)}-${quantize(target.x)},${quantize(target.z)}`;
}

export class PathCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(options: PathCacheOptions) {
    this.cache = new Map();
    this.maxSize = options.maxSize;
  }

  /**
   * Retrieves a cached path if available
   * @returns Cached path or null if not found
   */
  get(start: Point3D, target: Point3D): NavigationPath | null {
    const key = generateCacheKey(start, target);
    const entry = this.cache.get(key);

    if (entry) {
      this.hits++;
      // Update timestamp for LRU tracking
      entry.timestamp = Date.now();
      return entry.path;
    }

    this.misses++;
    return null;
  }

  /**
   * Stores a path in the cache with LRU eviction
   */
  set(start: Point3D, target: Point3D, path: NavigationPath): void {
    const key = generateCacheKey(start, target);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      path,
      timestamp: Date.now(),
    });
  }

  /**
   * Evicts the least recently used cache entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clears all cached paths (e.g., when obstacles change)
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Returns cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Resets hit/miss counters
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}
