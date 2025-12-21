/**
 * Raycast Scheduler for distributing raycast load across frames.
 * Uses frame staggering so each entity only raycasts every Nth frame.
 */

export interface CachedResult {
  avoidanceVector: { x: number; y: number; z: number };
  frameStamp: number;
}

export interface RaycastCache {
  get(entityId: number): CachedResult | null;
  set(entityId: number, result: CachedResult): void;
  clear(): void;
}

/**
 * Check if an entity should raycast this frame based on staggering.
 * Distributes raycasts evenly: entity N raycasts on frames where (frame % interval) === (entity % interval)
 */
export function shouldRaycastThisFrame(
  entityId: number,
  frameCount: number,
  staggerInterval: number = 3,
): boolean {
  return entityId % staggerInterval === frameCount % staggerInterval;
}

/**
 * Factory to create a Map-based cache for storing raycast results.
 */
export function createRaycastCache(): RaycastCache {
  const cache = new Map<number, CachedResult>();

  return {
    get(entityId: number): CachedResult | null {
      return cache.get(entityId) ?? null;
    },
    set(entityId: number, result: CachedResult): void {
      cache.set(entityId, result);
    },
    clear(): void {
      cache.clear();
    },
  };
}
