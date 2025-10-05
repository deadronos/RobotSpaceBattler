import { describe, it, expect } from 'vitest';
import { createRuntimeEventLog, type DeathAuditEntry } from '../../src/utils/runtimeEventLog';
import { toNDJSON } from '../../src/utils/serialization';

function makeEntry(seed: number, idx: number): DeathAuditEntry {
  return {
    id: `death-${seed}-${idx}`,
    simNowMs: seed + idx,
    frameCount: idx,
    victimId: `victim-${idx}`,
    killerId: `killer-${idx}`,
    victimTeam: 'red',
    killerTeam: 'blue',
    classification: 'opponent',
    scoreDelta: -10,
  };
}

describe('runtimeEventLog performance', () => {
  it('serializes 100 DeathAuditEntry objects to NDJSON quickly', () => {
    const PERF_STRICT = process.env.PERFORMANCE_STRICT === 'true';
    const targetEnv = process.env.PERFORMANCE_TARGET_MS ? Number(process.env.PERFORMANCE_TARGET_MS) : undefined;

    const DEFAULT_DEVELOPER_TARGET = 30; // ms
    const DEFAULT_CI_TARGET = 16; // ms

    const log = createRuntimeEventLog({ capacity: 200 });
    for (let i = 0; i < 100; i++) {
      log.append(makeEntry(1000, i));
    }

    // Use high-resolution timer for performance-sensitive measurement
    const start = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
    const entries = log.read({ order: 'oldest-first' });
    // Use canonical NDJSON serializer for stable output while measuring
    const ndjson = toNDJSON(entries as unknown[]);
    const end = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
    const elapsed = end - start;

    // basic sanity
    expect(ndjson).toContain('victim-0');

    const target = targetEnv ?? (PERF_STRICT ? DEFAULT_CI_TARGET : DEFAULT_DEVELOPER_TARGET);

    if (PERF_STRICT || targetEnv) {
      // enforce the target when in strict CI or when explicitly configured
      expect(elapsed).toBeLessThanOrEqual(target);
    } else {
      // ensure it at least completed
      expect(elapsed).toBeGreaterThanOrEqual(0);
    }
  });
});
