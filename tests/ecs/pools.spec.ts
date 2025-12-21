import { describe, expect, it } from 'vitest';

import { createEffectPool } from '../../src/ecs/pools/EffectPool';
import { createProjectilePool } from '../../src/ecs/pools/ProjectilePool';

describe('ECS pools', () => {
  it('reuses projectiles after release', () => {
    const pool = createProjectilePool(2);
    const a = pool.acquire();
    const b = pool.acquire();
    pool.release(a);

    const statsBefore = pool.getStats();
    expect(statsBefore.reused).toBe(2);
    expect(statsBefore.created).toBe(0);

    const reused = pool.acquire();
    expect(reused).toBe(a);

    const statsAfter = pool.getStats();
    expect(statsAfter.reused).toBeGreaterThan(statsBefore.reused);
    expect(statsAfter.created).toBe(0);
    expect(pool.getFreeCount()).toBe(0);

    pool.release(b);
    pool.release(reused);
    expect(pool.getFreeCount()).toBeGreaterThanOrEqual(2);
  });

  it('resets effect pool allocations', () => {
    const pool = createEffectPool(1);
    const effect = pool.acquire();
    effect.id = 'test';
    pool.release(effect);

    const stats = pool.getStats();
    expect(stats.reused).toBe(1);

    pool.reset();
    const afterReset = pool.getStats();
    expect(afterReset.created).toBe(0);
    expect(afterReset.reused).toBe(0);
    expect(pool.getFreeCount()).toBe(1);
  });
});
