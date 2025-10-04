import { describe, it, expect } from 'vitest';
import { createRuntimeEventLog, type DeathAuditEntry } from '../../src/utils/runtimeEventLog';

function makeEntry(id: string, ts = 0, frame = 0): DeathAuditEntry {
  return {
    id,
    simNowMs: ts,
    frameCount: frame,
    victimId: `victim-${id}`,
    victimTeam: 'red',
    classification: 'opponent',
    scoreDelta: 1,
  };
}

describe('RuntimeEventLog (ring buffer) edge cases', () => {
  it('overwrites oldest entries when capacity exceeded', () => {
    const log = createRuntimeEventLog({ capacity: 3 });

    log.append(makeEntry('a'));
    log.append(makeEntry('b'));
    log.append(makeEntry('c'));
    expect(log.size()).toBe(3);

    // This append should overwrite the oldest (a)
    log.append(makeEntry('d'));
    expect(log.size()).toBe(3);

    const oldestFirst = log.read({ order: 'oldest-first' }).map((e) => e.id);
    // With capacity=3 and 4 appends, expected order: b, c, d
    expect(oldestFirst).toEqual(['b', 'c', 'd']);
  });

  it('reads newest-first correctly', () => {
    const log = createRuntimeEventLog({ capacity: 4 });
    ['a', 'b', 'c', 'd'].forEach((id, i) => log.append(makeEntry(id, i * 10, i)));

    const newest = log.read({ order: 'newest-first' }).map((e) => e.id);
    expect(newest).toEqual(['d', 'c', 'b', 'a']);
  });

  it('clear resets buffer and size', () => {
    const log = createRuntimeEventLog({ capacity: 2 });
    log.append(makeEntry('x'));
    log.append(makeEntry('y'));
    expect(log.size()).toBe(2);

    log.clear();
    expect(log.size()).toBe(0);
    expect(log.read().length).toBe(0);
  });

  it('handles heavy interleaved append and read without corruption', () => {
    const CAP = 50;
    const TOTAL = 1000;
    const log = createRuntimeEventLog({ capacity: CAP });

    // Rapidly append many entries and intermittently read newest-first
    for (let i = 0; i < TOTAL; i++) {
      log.append(makeEntry(String(i), i, i));
      // Every 17 appends, perform a read and validate invariants
      if (i % 17 === 0) {
        const entries = log.read({ order: 'newest-first' });
        // size should never exceed capacity
        expect(entries.length).toBeLessThanOrEqual(CAP);
        if (entries.length > 0) {
          // newest-first: first entry should have the highest simNowMs
          const maxTs = Math.max(...entries.map((e) => e.simNowMs));
          expect(entries[0].simNowMs).toBe(maxTs);
        }
      }
    }

    // After all appends, the ring buffer should contain the last CAP entries in oldest-first order
    const lastEntries = log.read({ order: 'oldest-first' }).map((e) => e.id);
    const expectedStart = TOTAL - CAP;
    const expected = Array.from({ length: CAP }, (_, i) => String(expectedStart + i));
    expect(lastEntries).toEqual(expected);
  });

  it('read and append interleave preserves ordering and capacity with multiple reads', () => {
    const CAP = 20;
    const log = createRuntimeEventLog({ capacity: CAP });

    // Append CAP entries
    for (let i = 0; i < CAP; i++) log.append(makeEntry(String(i), i, i));

    // Interleave reads and appends
    for (let i = CAP; i < CAP + 200; i++) {
      if (i % 5 === 0) {
        const oldest = log.read({ order: 'oldest-first' }).map((e) => e.id);
        expect(oldest.length).toBeLessThanOrEqual(CAP);
      }
      log.append(makeEntry(String(i), i, i));
    }

    // Final consistency check
    const final = log.read({ order: 'oldest-first' }).map((e) => e.id);
    expect(final.length).toBe(CAP);
    // ensure monotonic increasing simNowMs values
    const sims = log.read({ order: 'oldest-first' }).map((e) => e.simNowMs);
    for (let j = 1; j < sims.length; j++) {
      expect(sims[j]).toBeGreaterThanOrEqual(sims[j - 1]);
    }
  });
});
