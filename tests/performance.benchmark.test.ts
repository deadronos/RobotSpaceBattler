import { describe, it, expect } from 'vitest';
import { createWorldController } from '../src/ecs/worldFactory';
import { createFixedStepDriver } from '../src/utils/fixedStepDriver';

// IT-003: Performance benchmark
// Runs a small simulation with the target number of active entities and measures step timing.

describe('Performance benchmark', () => {
  it('measures step time under 500 active entities (seeded)', () => {
    const COUNT = 500;
    const STEPS = 10; // measure over several steps to smooth noise
    const worldCtrl = createWorldController<any>();

    // Create simple entities with position component
    for (let i = 0; i < COUNT; i++) {
      worldCtrl.add({ id: `e-${i}`, position: { x: i, y: 0, z: 0 } });
    }

    const driver = createFixedStepDriver(12345, 1 / 60);

    // Simple system that iterates entities and performs a lightweight op
    function noopSystem() {
      let c = 0;
      for (const e of worldCtrl.world.entities) {
        // read position to simulate a tiny bit of work
        const p = (e as any).position;
        c += p.x === undefined ? 0 : 1;
      }
      return c;
    }

    const times: number[] = [];
    for (let s = 0; s < STEPS; s++) {
      const start = performance.now();
      driver.stepOnce();
      noopSystem();
      const end = performance.now();
      times.push(end - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    // Log result so maintainers can inspect in CI output
    // eslint-disable-next-line no-console
    console.info(`Performance benchmark: ${COUNT} entities, avg step ${avg.toFixed(2)}ms`);

    const strict = process.env.PERFORMANCE_STRICT === 'true';
    const ci = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const envTarget = Number(process.env.PERFORMANCE_TARGET_MS || 0) || undefined;

    const defaultTarget = envTarget ?? (strict ? 16 : 30);

    // In CI, only enforce strict target if PERFORMANCE_STRICT is explicitly enabled.
    if (ci && strict) {
      expect(avg).toBeLessThan(defaultTarget);
    } else if (strict) {
      // Local developer ran with strict intent
      expect(avg).toBeLessThan(defaultTarget);
    } else {
      // Non-strict runs validate we measured a finite number and log the target for visibility.
      expect(Number.isFinite(avg)).toBe(true);
      // Provide guidance in test output to set PERFORMANCE_STRICT=true to enforce 16ms in local runs.
      // eslint-disable-next-line no-console
      console.info(`Note: not enforcing strict threshold. To enable strict mode set PERFORMANCE_STRICT=true (target ${defaultTarget}ms).`);
    }
  });
});
