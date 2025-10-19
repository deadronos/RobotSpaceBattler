import { describe, it, expect } from 'vitest';
import { MatchPlayer, ReplayMode } from '../../src/systems/matchTrace/matchPlayer';
import { makeTraceWithSeed } from './matchReplay.test.helpers';

describe('Deterministic Replay Reproducibility', () => {
  it('should replay same sequence with same seed (SC-003)', () => {
    const trace = makeTraceWithSeed([
      { type: 'spawn', timestampMs: 0, sequenceId: 1, entityId: 'e1', teamId: 'team-1', position: { x: 0, y: 0, z: 0 } },
      { type: 'move', timestampMs: 100, sequenceId: 2, entityId: 'e1', position: { x: 5, y: 10, z: 0 } },
      { type: 'spawn', timestampMs: 200, sequenceId: 3, entityId: 'e2', teamId: 'team-2', position: { x: 100, y: 100, z: 0 } },
    ], 777);

    const player1 = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });
    const rng1 = player1.getRNGManager()!;
    const seq1 = [rng1.next(), rng1.next(), rng1.next()];

    const player2 = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });
    const rng2 = player2.getRNGManager()!;
    const seq2 = [rng2.next(), rng2.next(), rng2.next()];

    expect(seq1).toEqual(seq2);
  });

  it('should provide consistent RNG metadata across replays', () => {
    const trace = makeTraceWithSeed([], 777);
    const p1 = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });
    const meta1 = p1.getTraceMetadata();

    const p2 = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });
    const meta2 = p2.getTraceMetadata();

    expect(meta1.rngSeed).toBe(meta2.rngSeed);
    expect(meta1.rngAlgorithm).toBe(meta2.rngAlgorithm);
  });
});
