#!/usr/bin/env node
// Simple helper script to generate a golden NDJSON trace for manual QA.

import { mkdirSync } from 'fs';
import { join } from 'path';
import { createRuntimeEventLog } from '../../src/utils/runtimeEventLog';
import { createTestDriver, runDriverSteps } from '../helpers/fixedStepHarness';
import { projectilesToNDJSON } from '../../src/utils/replay';
import { createProjectileComponent } from '../../src/ecs/components/projectile';
import { buildCombinedTrace, writeGoldenTrace } from '../../src/utils/golden';

const OUT_DIR = join(process.cwd(), 'tests', 'golden', 'traces');

function main() {
  const seed = Number(process.env.SEED ?? 424242);
  const steps = Number(process.env.STEPS ?? 10);
  const name = process.env.NAME ?? `trace-${seed}-${steps}`;

  const driver = createTestDriver(seed);
  const contexts = runDriverSteps(driver, steps);

  const log = createRuntimeEventLog({ capacity: 1000 });
  contexts.forEach((ctx, idx) => {
    log.append({
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

  // Create some projectiles
  const projectiles = contexts.map((ctx, i) =>
    createProjectileComponent({
      sourceWeaponId: i,
      ownerId: `owner-${i}`,
      team: 'red',
      damage: i + 1,
      lifespan: 3,
      spawnTime: ctx.simNowMs,
    }),
  );

  const combined = buildCombinedTrace({
    events: log.read({ order: 'oldest-first' }),
    projectilesNDJSON: projectilesToNDJSON(projectiles),
    entitySnapshots: contexts.map((ctx, i) => ({ id: `ent-${i}`, team: 'red', position: [i, 0, 0] })),
  });

  const outPath = writeGoldenTrace(OUT_DIR, name, combined);
  console.log(`Wrote golden trace to ${outPath}`);
}

if (require.main === module) main();
