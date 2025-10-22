import { describe, it, expect, afterEach } from 'vitest';
import { initializeGlobalRNG, getGlobalRNG, clearGlobalRNG, resetGlobalRNG } from '../../src/systems/matchTrace/rngManager';
import { MatchPlayer, ReplayMode } from '../../src/systems/matchTrace/matchPlayer';
import { makeTraceWithSeed, createSpawnEvent } from './matchReplay.test.helpers';

describe('Global RNG & MatchPlayer Replay Mode', () => {
  afterEach(() => {
    clearGlobalRNG();
  });

  it('should initialize and retrieve global RNG', () => {
    const rng = initializeGlobalRNG(999);
    const retrieved = getGlobalRNG();

    expect(rng).toBe(retrieved);
    expect(rng.getSeed()).toBe(999);
  });

  it('should initialize MatchPlayer with Deterministic RNG', () => {
    const trace = makeTraceWithSeed([createSpawnEvent('e1', 0)]);
    const player = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });

    expect(player.getReplayMode()).toBe(ReplayMode.Deterministic);
    expect(player.getRNGManager()).not.toBeNull();
    expect(player.getRNGManager()?.getSeed()).toBe(42);
  });

  it('should warn on missing RNG metadata', () => {
    const trace: any = { events: [createSpawnEvent('e1', 0)] };
    const player = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });

    const validation = player.validateRNGMetadata();
    expect(validation.valid).toBe(false);
    expect(validation.warning).toBeDefined();
  });
});
