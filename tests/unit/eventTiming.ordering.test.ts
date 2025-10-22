import { describe, it, expect } from 'vitest';
import { MatchPlayer } from '../../src/systems/matchTrace/matchPlayer';
import { createSpawn, createMove, createFire, createHit, makeTrace } from './eventTiming.test.helpers';

describe('Event Ordering & Timestamp Precision', () => {
  it('should maintain stable ordering when timestamps are identical', () => {
    const trace = makeTrace([
      createSpawn('e1', 1, 0),
      createSpawn('e2', 2, 100),
      createMove('e1', 3, 200, 10, 10),
      createMove('e2', 4, 200, 60, 60),
    ]);

    const player = new MatchPlayer({ trace });
    const eventsBefore = player.getEventsBefore(200);
    const movesAt200 = eventsBefore.filter((e) => e.timestampMs === 200);

    expect(movesAt200.length).toBe(2);
    expect(movesAt200[0].sequenceId).toBe(3);
    expect(movesAt200[1].sequenceId).toBe(4);
  });

  it('should preserve insertion order when sequenceId not specified', () => {
    const events = [
      createSpawn('e1', 1, 0),
      createSpawn('e2', 2, 0),
    ];

    const trace = makeTrace(events);
    const player = new MatchPlayer({ trace });
    const eventsBefore = player.getEventsBefore(0);

    expect((eventsBefore[0] as any).entityId).toBe('e1');
    expect((eventsBefore[1] as any).entityId).toBe('e2');
  });

  it('should handle 100+ simultaneous events deterministically', () => {
    const events = [] as any[];
    for (let i = 1; i <= 100; i++) {
      events.push(createMove(`e${i}`, i, 500, i, i));
    }

    const trace = makeTrace(events);
    const player = new MatchPlayer({ trace });

    const eventsBefore = player.getEventsBefore(500);
    expect(eventsBefore.length).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(eventsBefore[i].sequenceId).toBe(i + 1);
    }
  });

  it('should support sub-millisecond event ordering via sequenceId', () => {
    const trace = makeTrace([
      createFire('e1', 'p1', 1, 100),
      createHit('p1', 'e2', 2, 100),
    ]);

    const player = new MatchPlayer({ trace });
    const eventsAt100 = player.getEventsBefore(100);

    expect(eventsAt100.length).toBe(2);
    expect(eventsAt100[0].type).toBe('fire');
    expect(eventsAt100[1].type).toBe('hit');
  });
});
