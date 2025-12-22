import { vec3 } from "../../lib/math/vec3";
import type { EffectEntity } from "../worldTypes";

/**
 * Statistics for effect pool usage.
 */
export interface EffectPoolStats {
  /** Number of new effect objects created. */
  created: number;
  /** Number of times an existing effect object was reused. */
  reused: number;
  /** Number of times an effect object was released back to the pool. */
  released: number;
}

/**
 * Interface for the object pool managing effect entities.
 * Helps reduce garbage collection overhead by reusing objects.
 */
export interface EffectPool {
  /** Gets an effect entity from the pool (or creates a new one). */
  acquire: () => EffectEntity;
  /** Returns an effect entity to the pool for reuse. */
  release: (effect: EffectEntity) => void;
  /** Resets the pool and clears stats. */
  reset: () => void;
  /** Gets the number of free objects currently in the pool. */
  getFreeCount: () => number;
  /** Gets usage statistics. */
  getStats: () => EffectPoolStats;
}

/**
 * Creates an empty effect entity with default values.
 * @returns A new EffectEntity.
 */
function createEmptyEffect(): EffectEntity {
  return {
    id: "",
    kind: "effect",
    effectType: "impact",
    position: vec3(),
    radius: 0,
    color: "#ffffff",
    createdAt: 0,
    duration: 0,
  };
}

/**
 * Creates a pool for managing EffectEntity objects.
 *
 * @param initialSize - The initial number of objects to pre-allocate (default 64).
 * @returns An EffectPool instance.
 */
export function createEffectPool(initialSize = 64): EffectPool {
  const free: EffectEntity[] = [];
  const stats: EffectPoolStats = {
    created: 0,
    reused: 0,
    released: 0,
  };

  const seed = Math.max(0, initialSize);
  for (let index = 0; index < seed; index += 1) {
    free.push(createEmptyEffect());
  }

  function acquire(): EffectEntity {
    const effect = free.pop();
    if (effect) {
      stats.reused += 1;
      return effect;
    }
    stats.created += 1;
    return createEmptyEffect();
  }

  function release(effect: EffectEntity): void {
    effect.instanceIndex = undefined;
    effect.id = "";
    effect.secondaryColor = undefined;
    effect.effectType = "impact";
    effect.position = vec3();
    effect.radius = 0;
    effect.color = "#ffffff";
    effect.createdAt = 0;
    effect.duration = 0;
    stats.released += 1;
    free.push(effect);
  }

  function reset(): void {
    free.splice(0, free.length);
    stats.created = 0;
    stats.reused = 0;
    stats.released = 0;
    for (let index = 0; index < seed; index += 1) {
      free.push(createEmptyEffect());
    }
  }

  return {
    acquire,
    release,
    reset,
    getFreeCount: () => free.length,
    getStats: () => ({ ...stats }),
  };
}
