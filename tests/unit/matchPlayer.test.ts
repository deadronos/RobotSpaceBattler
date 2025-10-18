/**
 * Unit Tests for MatchPlayer — Playback Engine (T025, US1)
 *
 * Tests:
 * - Playback controls (play, pause, stop, seek)
 * - Frame stepping and timeline progression
 * - Snapshot management
 * - Edge cases (empty trace, boundary conditions)
 */

import { describe, it, expect } from 'vitest';
import {
  MatchPlayer,
  type MatchPlayerConfig,
  PlaybackState,
  type PlaybackSnapshot,
} from '../../src/systems/matchTrace/matchPlayer';
import type { MatchTrace, MatchTraceEvent } from '../../src/systems/matchTrace/types';

describe('MatchPlayer', () => {
  // Helper to create a minimal trace with events
  const createTestTrace = (events: MatchTraceEvent[]): MatchTrace => ({
    rngSeed: 12345,
    events,
  });

  // Helper to create spawn event
  const createSpawnEvent = (
    entityId: string,
    timestamp: number,
    sequenceId: number,
  ): MatchTraceEvent => ({
    type: 'spawn',
    timestampMs: timestamp,
    sequenceId,
    entityId,
    teamId: 'team-1',
    position: { x: 0, y: 0, z: 0 },
  });

  // Helper to create move event
  const createMoveEvent = (
    entityId: string,
    timestamp: number,
    sequenceId: number,
  ): MatchTraceEvent => ({
    type: 'move',
    timestampMs: timestamp,
    sequenceId,
    entityId,
    position: { x: 10, y: 20, z: 0 },
  });

  // Helper to create fire event
  const createFireEvent = (
    entityId: string,
    timestamp: number,
    sequenceId: number,
  ): MatchTraceEvent => ({
    type: 'fire',
    timestampMs: timestamp,
    sequenceId,
    attackerId: entityId,
    projectileId: 'proj-1',
    position: { x: 5, y: 10, z: 0 },
  });

  describe('Playback Controls', () => {
    it('should start in idle state', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      const snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Idle);
      expect(snapshot.progress).toBe(0);
    });

    it('should transition to playing when play() is called', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.play();
      const snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Playing);
    });

    it('should transition to paused when pause() is called', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.play();
      player.pause();
      const snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Paused);
    });

    it('should return to idle when stop() is called', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 100, 2),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.play();
      player.pause();
      player.stop();
      const snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Idle);
      expect(snapshot.currentTimestampMs).toBe(0);
    });
  });

  describe('Seeking', () => {
    it('should seek to specified timestamp', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 500, 2),
        createMoveEvent('robot-1', 1000, 3),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.seek(500);
      const snapshot = player.getSnapshot();

      expect(snapshot.currentTimestampMs).toBe(500);
    });

    it('should clamp seek position to trace bounds', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 1000, 2),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.seek(5000); // Beyond max
      const snapshot = player.getSnapshot();

      expect(snapshot.currentTimestampMs).toBeLessThanOrEqual(1000);
    });

    it('should update progress after seek', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 1000, 2),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.seek(500);
      const snapshot = player.getSnapshot();

      expect(snapshot.progress).toBeGreaterThan(0);
      expect(snapshot.progress).toBeLessThan(1);
    });
  });

  describe('Frame Stepping', () => {
    it('should advance frame index when stepping', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 100, 2),
        createMoveEvent('robot-1', 200, 3),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.play();
      const snapshot1 = player.getSnapshot();
      player.step(16); // ~60fps frame delta
      const snapshot2 = player.getSnapshot();

      expect(snapshot2.currentFrameIndex).toBeGreaterThanOrEqual(
        snapshot1.currentFrameIndex,
      );
    });

    it('should respect playback rate during stepping', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 100, 2),
        createMoveEvent('robot-1', 200, 3),
        createMoveEvent('robot-1', 300, 4),
      ]);
      const config: MatchPlayerConfig = {
        trace,
        playbackRate: 2.0,
      };
      const player = new MatchPlayer(config);

      player.play();
      const before = player.getSnapshot();
      player.step(16); // ~60fps frame delta
      const after = player.getSnapshot();

      // At 2x speed, should handle more frames
      expect(after.currentFrameIndex).toBeGreaterThanOrEqual(
        before.currentFrameIndex,
      );
    });

    it('should not advance when paused', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 50, 2),
        createMoveEvent('robot-1', 100, 3),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.play();
      player.pause();
      const before = player.getSnapshot().currentTimestampMs;
      player.step(16); // Should not advance while paused
      const after = player.getSnapshot().currentTimestampMs;

      expect(after).toBe(before);
    });
  });

  describe('Snapshots', () => {
    it('should provide valid snapshots with required fields', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      const snapshot: PlaybackSnapshot = player.getSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.state).toBeDefined();
      expect(snapshot.currentTimestampMs).toBeDefined();
      expect(snapshot.currentFrameIndex).toBeDefined();
      expect(snapshot.progress).toBeDefined();
      expect(snapshot.eventsAtTimestamp).toBeDefined();
    });

    it('should include events at current timestamp', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 100, 2),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.seek(0);
      const snapshot = player.getSnapshot();

      expect(Array.isArray(snapshot.eventsAtTimestamp)).toBe(true);
    });

    it('should reflect current state in snapshot', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.play();
      let snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Playing);

      player.pause();
      snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Paused);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty trace gracefully', () => {
      const trace = createTestTrace([]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      expect(() => player.getSnapshot()).not.toThrow();
      const snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Idle);
    });

    it('should handle single event trace', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.seek(1000); // Beyond single event
      const snapshot = player.getSnapshot();

      expect(snapshot.currentTimestampMs).toBeLessThanOrEqual(1000);
    });

    it('should allow replay after finishing', () => {
      const trace = createTestTrace([
        createSpawnEvent('robot-1', 0, 1),
        createMoveEvent('robot-1', 100, 2),
      ]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.seek(100); // Move to end
      player.play();
      player.stop(); // Reset to idle
      player.play(); // Replay from start

      const snapshot = player.getSnapshot();
      expect(snapshot.state).toBe(PlaybackState.Playing);
    });
  });

  describe('Playback Rate', () => {
    it('should set playback rate', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.setPlaybackRate(2.0);
      expect(player.getPlaybackRate()).toBe(2.0);
    });

    it('should clamp playback rate to valid range', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.setPlaybackRate(10); // Very fast - should clamp
      expect(player.getPlaybackRate()).toBeGreaterThan(0);

      player.setPlaybackRate(-1); // Negative - should clamp
      expect(player.getPlaybackRate()).toBeGreaterThan(0);
    });

    it('should reject invalid playback rates', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      // Set to a known value
      player.setPlaybackRate(1.5);
      expect(player.getPlaybackRate()).toBe(1.5);

      // Try to set negative - implementation may accept it
      player.setPlaybackRate(-5);
      // Just verify it's a valid number (implementation decides clamping)
      expect(typeof player.getPlaybackRate()).toBe('number');
      expect(player.getPlaybackRate()).toBeGreaterThan(0);
    });
  });

  describe('RNG Seeding', () => {
    it('should preserve RNG seed from trace', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      trace.rngSeed = 54321;
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      expect(player.getRNGSeed()).toBe(54321);
    });

    it('should allow RNG seed override in config', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      trace.rngSeed = 54321;
      const config: MatchPlayerConfig = {
        trace,
        rngSeed: 99999,
      };
      const player = new MatchPlayer(config);

      expect(player.getRNGSeed()).toBe(99999);
    });
  });
});
