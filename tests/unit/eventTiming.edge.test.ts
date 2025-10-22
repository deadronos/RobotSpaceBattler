import { describe, it, expect } from 'vitest';
import { MatchPlayer } from '../../src/systems/matchTrace/matchPlayer';
import { makeTrace, createSpawn } from './eventTiming.test.helpers';

describe('Event Timing Edge Cases', () => {
  it('should handle empty trace', () => {
    const trace = makeTrace([]);
    const player = new MatchPlayer({ trace });

    player.play();
    player.step(1000);

    const snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(0);
    expect(snapshot.state).toBe('finished');
  });

  it('should handle single event', () => {
    const trace = makeTrace([createSpawn('e1', 1, 0)]);
    const player = new MatchPlayer({ trace });
    player.seek(0);

    const snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(0);
    expect(snapshot.eventsAtTimestamp.length).toBe(1);
  });

  it('should clamp seek beyond max timestamp', () => {
    const trace = makeTrace([createSpawn('e1', 1, 0), createSpawn('e1', 2, 100,)]);
    const player = new MatchPlayer({ trace });
    player.seek(9999);

    const snapshot = player.getSnapshot();
    expect(snapshot.currentTimestampMs).toBe(100);
    expect(snapshot.state).toBe('finished');
  });

  it('should handle negative seek (clamp to 0)', () => {
    const trace = makeTrace([createSpawn('e1', 1, 0)]);
    const player = new MatchPlayer({ trace });
    player.seek(-100);

    const snapshot = player.getSnapshot();
    expect(snapshot.currentTimestampMs).toBe(0);
  });
});
