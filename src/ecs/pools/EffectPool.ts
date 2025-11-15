import { vec3 } from '../../lib/math/vec3';
import { EffectEntity } from '../world';

export interface EffectPoolStats {
  created: number;
  reused: number;
  released: number;
}

export interface EffectPool {
  acquire: () => EffectEntity;
  release: (effect: EffectEntity) => void;
  reset: () => void;
  getFreeCount: () => number;
  getStats: () => EffectPoolStats;
}

function createEmptyEffect(): EffectEntity {
  return {
    id: '',
    kind: 'effect',
    effectType: 'impact',
    position: vec3(),
    radius: 0,
    color: '#ffffff',
    createdAt: 0,
    duration: 0,
  };
}

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
    effect.id = '';
    effect.secondaryColor = undefined;
    effect.effectType = 'impact';
    effect.position = vec3();
    effect.radius = 0;
    effect.color = '#ffffff';
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
