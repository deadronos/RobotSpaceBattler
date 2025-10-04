import { describe, it, expect } from 'vitest';
import { createRuntimeEventLog, type DeathAuditEntry } from '../../src/utils/runtimeEventLog';

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
  it('serializes 100 DeathAuditEntry objects to NDJSON quickly when PERFORMANCE_STRICT=true', () => {
    const PERF_STRICT = process.env.PERFORMANCE_STRICT === 'true';

    const log = createRuntimeEventLog({ capacity: 200 });
    for (let i = 0; i < 100; i++) {
      log.append(makeEntry(1000, i));
    }

    // Use high-resolution timer for performance-sensitive measurement
    const start = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
    const entries = log.read({ order: 'oldest-first' });
    const ndjson = entries.map((e: DeathAuditEntry) => JSON.stringify(e)).join('\n');
    const end = typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
    const elapsed = end - start;

    // basic sanity
    expect(ndjson).toContain('victim-0');

    if (PERF_STRICT) {
      // allow up to 50ms in strict mode on CI; local runs may be relaxed
      expect(elapsed).toBeLessThanOrEqual(50);
    } else {
      // ensure it at least completed
      expect(elapsed).toBeGreaterThanOrEqual(0);
    }
  });
});
