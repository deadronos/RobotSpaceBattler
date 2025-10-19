import { describe, it, expect } from 'vitest';
import { MatchPlayer } from '../../src/systems/matchTrace/matchPlayer';
import { createSpawn, createMove, makeTrace } from './eventTiming.test.helpers';

describe('Frame Index Mapping & Playback Steps', () => {
  it('should map timestamp to correct frame index', () => {
    const trace = makeTrace([
      createSpawn('e1', 1, 0),
      createMove('e1', 2, 100, 10, 10),
      createMove('e1', 3, 200, 20, 20),
    ]);

    const player = new MatchPlayer({ trace });

    player.seek(0);
    let snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(0);

    player.seek(100);
    snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(1);

    player.seek(200);
    snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(2);

    player.seek(150);
    snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(1);
  });

  it('should update frame index on playback step', () => {
    const trace = makeTrace([
      createSpawn('e1', 1, 0),
      createMove('e1', 2, 1000, 10, 10),
    ]);

    const player = new MatchPlayer({ trace, playbackRate: 1 });
    player.play();

    let snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(0);

    player.step(500);
    snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(0);

    player.step(600);
    snapshot = player.getSnapshot();
    expect(snapshot.currentFrameIndex).toBe(1);
  });
});
