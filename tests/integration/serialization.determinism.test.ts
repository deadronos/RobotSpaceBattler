import { describe, it, expect } from 'vitest';
import { createRuntimeEventLog } from '../../src/utils/runtimeEventLog';
import { createTestDriver, runDriverSteps } from '../helpers/fixedStepHarness';

describe('serialization determinism', () => {
  it('produces identical NDJSON output across two runs with the same seed', () => {
    const seed = 424242;
    const driver1 = createTestDriver(seed);
    const driver2 = createTestDriver(seed);

    const log1 = createRuntimeEventLog({ capacity: 100 });
    const log2 = createRuntimeEventLog({ capacity: 100 });

    const steps = runDriverSteps(driver1, 5);
    const steps2 = runDriverSteps(driver2, 5);

    // For each step, append a deterministic entry to each log using the driver contexts
    steps.forEach((ctx, idx) => {
      log1.append({
        id: `death-${ctx.frameCount}-${idx}`,
        simNowMs: ctx.simNowMs,
        frameCount: ctx.frameCount,
        victimId: `v-${idx}`,
        killerId: `k-${idx}`,
        victimTeam: 'red',
        killerTeam: 'blue',
        classification: 'opponent',
        scoreDelta: -5,
      });
    });

    steps2.forEach((ctx, idx) => {
      log2.append({
        id: `death-${ctx.frameCount}-${idx}`,
        simNowMs: ctx.simNowMs,
        frameCount: ctx.frameCount,
        victimId: `v-${idx}`,
        killerId: `k-${idx}`,
        victimTeam: 'red',
        killerTeam: 'blue',
        classification: 'opponent',
        scoreDelta: -5,
      });
    });

    const nd1 = log1.read({ order: 'oldest-first' }).map((e) => JSON.stringify(e)).join('\n');
    const nd2 = log2.read({ order: 'oldest-first' }).map((e) => JSON.stringify(e)).join('\n');

    expect(nd1).toEqual(nd2);
  });
});
