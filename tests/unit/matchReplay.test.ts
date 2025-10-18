/**
 * Unit Tests for RNG Manager & Deterministic Replay (T040, US3)
 *
 * Tests:
 * - RNG determinism: same seed produces same sequence
 * - RNG state management: reset, seeding
 * - Replay mode initialization with RNG
 * - Metadata validation for cross-implementation replay
 * - RNG metadata recording in MatchTrace
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { MatchPlayer, ReplayMode } from '../../src/systems/matchTrace/matchPlayer';
import {
  RNGManager,
  RNG_ALGORITHM_ID,
  initializeGlobalRNG,
  getGlobalRNG,
  clearGlobalRNG,
  resetGlobalRNG,
} from '../../src/systems/matchTrace/rngManager';
import type { MatchTrace, MatchTraceEvent } from '../../src/systems/matchTrace/types';

describe('RNG Manager — Deterministic Replay (T040, US3)', () => {
  afterEach(() => {
    clearGlobalRNG();
  });

  // ========================================================================
  // RNG Manager Tests
  // ========================================================================

  describe('RNGManager', () => {
    it('should generate deterministic sequence with same seed', () => {
      const seed = 42;
      const rng1 = new RNGManager(seed);
      const rng2 = new RNGManager(seed);

      const sequence1: number[] = [];
      const sequence2: number[] = [];

      for (let i = 0; i < 100; i++) {
        sequence1.push(rng1.next());
        sequence2.push(rng2.next());
      }

      expect(sequence1).toEqual(sequence2);
    });

    it('should generate different sequences with different seeds', () => {
      const rng1 = new RNGManager(42);
      const rng2 = new RNGManager(123);

      const sequence1 = [rng1.next(), rng1.next(), rng1.next()];
      const sequence2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should reset to initial state on reset()', () => {
      const rng = new RNGManager(42);

      const firstRun: number[] = [];
      for (let i = 0; i < 5; i++) {
        firstRun.push(rng.next());
      }

      rng.reset();

      const secondRun: number[] = [];
      for (let i = 0; i < 5; i++) {
        secondRun.push(rng.next());
      }

      expect(firstRun).toEqual(secondRun);
    });

    it('should generate integers in correct range', () => {
      const rng = new RNGManager(42);
      const max = 10;

      for (let i = 0; i < 1000; i++) {
        const num = rng.nextInt(max);
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(max);
      }
    });

    it('should generate floats in correct range with nextRange()', () => {
      const rng = new RNGManager(42);
      const min = 10;
      const max = 20;

      for (let i = 0; i < 100; i++) {
        const num = rng.nextRange(min, max);
        expect(num).toBeGreaterThanOrEqual(min);
        expect(num).toBeLessThan(max);
      }
    });

    it('should generate booleans with specified probability', () => {
      const rng = new RNGManager(42);
      const trueCount = Array.from({ length: 10000 }, () => rng.nextBool(0.3)).filter(
        Boolean,
      ).length;

      // Expect approximately 30% true (with some tolerance)
      const percentage = trueCount / 10000;
      expect(percentage).toBeGreaterThan(0.25);
      expect(percentage).toBeLessThan(0.35);
    });

    it('should track call count', () => {
      const rng = new RNGManager(42);
      expect(rng.getCallCount()).toBe(0);

      rng.next();
      expect(rng.getCallCount()).toBe(1);

      rng.nextInt(100);
      expect(rng.getCallCount()).toBe(2);

      rng.reset();
      expect(rng.getCallCount()).toBe(0);
    });

    it('should provide metadata for recording', () => {
      const rng = new RNGManager(12345);
      const metadata = rng.getMetadata();

      expect(metadata.rngSeed).toBe(12345);
      expect(metadata.rngAlgorithm).toBe(RNG_ALGORITHM_ID);
    });

    it('should handle seed 0 by converting to 1', () => {
      const rng = new RNGManager(0);
      expect(rng.getSeed()).toBe(1);

      // Should generate values (not stuck in infinite loop)
      const val = rng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });

    it('should setSeed and reset properly', () => {
      const rng = new RNGManager(42);
      const seq1 = [rng.next(), rng.next(), rng.next()];

      // setSeed resets to beginning, so calling next() again should produce same sequence
      rng.setSeed(42);
      const seq2 = [rng.next(), rng.next(), rng.next()];

      expect(seq1).toEqual(seq2);
    });
  });

  // ========================================================================
  // Global RNG Tests
  // ========================================================================

  describe('Global RNG Instance', () => {
    it('should initialize and retrieve global RNG', () => {
      const rng = initializeGlobalRNG(999);
      const retrieved = getGlobalRNG();

      expect(rng).toBe(retrieved);
      expect(rng.getSeed()).toBe(999);
    });

    it('should throw if accessing uninitialized global RNG', () => {
      clearGlobalRNG();
      expect(() => getGlobalRNG()).toThrow();
    });

    it('should reset global RNG', () => {
      initializeGlobalRNG(42);
      const rng = getGlobalRNG();

      const seq1 = [rng.next(), rng.next()];
      resetGlobalRNG();
      const seq2 = [rng.next(), rng.next()];

      expect(seq1).toEqual(seq2);
    });
  });

  // ========================================================================
  // MatchPlayer Replay Mode Tests
  // ========================================================================

  describe('MatchPlayer Replay Mode (T036, T039)', () => {
    const createTestTrace = (events: MatchTraceEvent[]): MatchTrace => ({
      rngSeed: 42,
      rngAlgorithm: RNG_ALGORITHM_ID,
      events,
    });

    const createSpawnEvent = (id: string, timestamp: number): MatchTraceEvent => ({
      type: 'spawn',
      timestampMs: timestamp,
      sequenceId: 1,
      entityId: id,
      teamId: 'team-1',
      position: { x: 0, y: 0, z: 0 },
    });

    it('should initialize with ReplayMode.Live by default', () => {
      const trace = createTestTrace([createSpawnEvent('e1', 0)]);
      const player = new MatchPlayer({ trace });

      expect(player.getReplayMode()).toBe(ReplayMode.Live);
      expect(player.getRNGManager()).toBeNull();
    });

    it('should initialize with ReplayMode.Deterministic and create RNG', () => {
      const trace = createTestTrace([createSpawnEvent('e1', 0)]);
      const player = new MatchPlayer({
        trace,
        replayMode: ReplayMode.Deterministic,
      });

      expect(player.getReplayMode()).toBe(ReplayMode.Deterministic);
      expect(player.getRNGManager()).not.toBeNull();
      expect(player.getRNGManager()?.getSeed()).toBe(42);
    });

    it('should switch replay mode and initialize RNG', () => {
      const trace = createTestTrace([createSpawnEvent('e1', 0)]);
      const player = new MatchPlayer({ trace });

      expect(player.getRNGManager()).toBeNull();

      player.setReplayMode(ReplayMode.Deterministic);
      expect(player.getReplayMode()).toBe(ReplayMode.Deterministic);
      expect(player.getRNGManager()).not.toBeNull();
    });

    it('should validate RNG metadata', () => {
      const trace = createTestTrace([createSpawnEvent('e1', 0)]);
      const player = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });

      const validation = player.validateRNGMetadata();
      expect(validation.valid).toBe(true);
      expect(validation.rngSeed).toBe(42);
      expect(validation.rngAlgorithm).toBe(RNG_ALGORITHM_ID);
    });

    it('should warn on missing RNG metadata', () => {
      const trace: MatchTrace = {
        // No rngSeed or rngAlgorithm
        events: [createSpawnEvent('e1', 0)],
      };
      const player = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });

      const validation = player.validateRNGMetadata();
      expect(validation.valid).toBe(false);
      expect(validation.warning).toBeDefined();
    });

    it('should warn on algorithm mismatch', () => {
      const trace: MatchTrace = {
        rngSeed: 42,
        rngAlgorithm: 'unknown-algorithm-v2',
        events: [createSpawnEvent('e1', 0)],
      };
      const player = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });

      const validation = player.validateRNGMetadata();
      expect(validation.valid).toBe(false);
      expect(validation.warning).toContain('mismatch');
    });

    it('should track RNG call count', () => {
      const trace = createTestTrace([createSpawnEvent('e1', 0)]);
      const player = new MatchPlayer({ trace, replayMode: ReplayMode.Deterministic });
      const rng = player.getRNGManager();

      expect(rng?.getCallCount()).toBe(0);

      rng?.next();
      rng?.next();
      expect(rng?.getCallCount()).toBe(2);

      player.resetRNG();
      expect(rng?.getCallCount()).toBe(0);
    });
  });

  // ========================================================================
  // Deterministic Replay Reproducibility Tests
  // ========================================================================

  describe('Deterministic Replay Reproducibility (SC-003)', () => {
    const createTestTrace = (): MatchTrace => ({
      rngSeed: 777,
      rngAlgorithm: RNG_ALGORITHM_ID,
      events: [
        {
          type: 'spawn',
          timestampMs: 0,
          sequenceId: 1,
          entityId: 'e1',
          teamId: 'team-1',
          position: { x: 0, y: 0, z: 0 },
        },
        {
          type: 'move',
          timestampMs: 100,
          sequenceId: 2,
          entityId: 'e1',
          position: { x: 5, y: 10, z: 0 },
        },
        {
          type: 'spawn',
          timestampMs: 200,
          sequenceId: 3,
          entityId: 'e2',
          teamId: 'team-2',
          position: { x: 100, y: 100, z: 0 },
        },
      ],
    });

    it('should replay same sequence with same seed (SC-003)', () => {
      const trace = createTestTrace();

      // Replay 1
      const player1 = new MatchPlayer({
        trace,
        replayMode: ReplayMode.Deterministic,
      });
      const rng1 = player1.getRNGManager()!;
      const seq1 = [rng1.next(), rng1.next(), rng1.next()];

      // Replay 2
      const player2 = new MatchPlayer({
        trace,
        replayMode: ReplayMode.Deterministic,
      });
      const rng2 = player2.getRNGManager()!;
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('should provide consistent RNG metadata across replays', () => {
      const trace = createTestTrace();

      const player1 = new MatchPlayer({
        trace,
        replayMode: ReplayMode.Deterministic,
      });
      const meta1 = player1.getTraceMetadata();

      const player2 = new MatchPlayer({
        trace,
        replayMode: ReplayMode.Deterministic,
      });
      const meta2 = player2.getTraceMetadata();

      expect(meta1.rngSeed).toBe(meta2.rngSeed);
      expect(meta1.rngAlgorithm).toBe(meta2.rngAlgorithm);
    });
  });
});
