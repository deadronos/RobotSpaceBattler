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
});
