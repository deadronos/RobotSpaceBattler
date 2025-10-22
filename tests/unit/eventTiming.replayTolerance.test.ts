import { describe, it, expect } from 'vitest';
import { MatchPlayer } from '../../src/systems/matchTrace/matchPlayer';
import { createSpawn, makeTrace } from './eventTiming.test.helpers';

describe('Replay Tolerance ±16ms and FPS behavior', () => {
  it('should maintain timestamp within ±16ms tolerance', () => {
    const trace = makeTrace([
      createSpawn('e1', 1, 0),
      createSpawn('e1', 2, 1000),
    ]);

    const player = new MatchPlayer({ trace });
    player.seek(1000);
    const snapshot = player.getSnapshot();

    expect(snapshot.currentTimestampMs).toBe(1000);
    expect(Math.abs(snapshot.currentTimestampMs - 1000)).toBeLessThanOrEqual(0);
  });

  it('should handle 60fps playback (16.67ms frames)', () => {
    const fps60FrameDuration = 1000 / 60;
    const trace = makeTrace(
      Array.from({ length: 60 }, (_, i) => ({
        type: 'move' as const,
        timestampMs: Math.round(i * fps60FrameDuration),
        sequenceId: i + 1,
        entityId: 'e1',
        position: { x: i, y: i, z: 0 },
      }))
    );

    const player = new MatchPlayer({ trace, playbackRate: 1 });
    player.play();

    player.step(fps60FrameDuration);
    const snapshot = player.getSnapshot();

    const expectedTime = Math.round(fps60FrameDuration);
    expect(Math.abs(snapshot.currentTimestampMs - expectedTime)).toBeLessThanOrEqual(1);
  });
});
