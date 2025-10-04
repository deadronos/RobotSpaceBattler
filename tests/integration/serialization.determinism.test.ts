import { describe, it, expect } from 'vitest';
import { createRuntimeEventLog } from '../../src/utils/runtimeEventLog';
import { createTestDriver, runDriverSteps } from '../helpers/fixedStepHarness';
import { projectilesToNDJSON } from '../../src/utils/replay';
import { createProjectileComponent } from '../../src/ecs/components/projectile';
import { toNDJSON, canonicalJSONStringify } from '../../src/utils/serialization';

function makeEntitySnapshot(i: number, ctx: any) {
  return {
    id: `ent-${i}`,
    team: i % 2 === 0 ? 'red' : 'blue',
    position: [i, i * 2, 0],
    health: { current: 100 - i, max: 100, alive: true },
    weapon: { id: `w-${i}`, type: 'gun' },
    invulnerableUntil: ctx.simNowMs + 1000,
  };
}

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

    const nd1 = toNDJSON(log1.read({ order: 'oldest-first' }) as unknown[]);
    const nd2 = toNDJSON(log2.read({ order: 'oldest-first' }) as unknown[]);

    // Also verify projectile NDJSON determinism for the same seeded runs
    const projectiles1 = steps.map((ctx, i) =>
      createProjectileComponent({
        sourceWeaponId: i,
        ownerId: `owner-${i}`,
        team: 'red',
        damage: i + 1,
        lifespan: 3,
        spawnTime: ctx.simNowMs,
      }),
    );
    const projectiles2 = steps2.map((ctx, i) =>
      createProjectileComponent({
        sourceWeaponId: i,
        ownerId: `owner-${i}`,
        team: 'red',
        damage: i + 1,
        lifespan: 3,
        spawnTime: ctx.simNowMs,
      }),
    );

    const pnd1 = projectilesToNDJSON(projectiles1);
    const pnd2 = projectilesToNDJSON(projectiles2);

    // Add entity snapshots serialized deterministically
    const snaps1 = steps.map((ctx, i) => makeEntitySnapshot(i, ctx));
    const snaps2 = steps2.map((ctx, i) => makeEntitySnapshot(i, ctx));

    const s1 = toNDJSON(snaps1 as unknown[]);
    const s2 = toNDJSON(snaps2 as unknown[]);

    // Compare combined NDJSON outputs
    expect([nd1, pnd1, s1].join('\n---\n')).toEqual([nd2, pnd2, s2].join('\n---\n'));
  });
});
