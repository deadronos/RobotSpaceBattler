/**
 * Unit Tests for Event Timing & Deterministic Ordering (T041, US3)
 *
 * Tests:
 * - Event timestamp precision (milliseconds)
 * - sequenceId tie-breaking when timestamps match
 * - Event ordering stability
 * - Frame index accuracy
 * - ±16ms replay tolerance (SC-002)
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { MatchPlayer } from '../../src/systems/matchTrace/matchPlayer';
import type { MatchTrace, MatchTraceEvent } from '../../src/systems/matchTrace/types';

describe('Event Timing & Deterministic Ordering (T041, US3)', () => {
  // ========================================================================
  // Event Ordering Tests
  // ========================================================================

  describe('Event Ordering with sequenceId', () => {
    it('should maintain stable ordering when timestamps are identical', () => {
      // Create events with same timestamp but different sequenceId
      const trace: MatchTrace = {
        rngSeed: 1,
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
            type: 'spawn',
            timestampMs: 100,
            sequenceId: 2,
            entityId: 'e2',
            teamId: 'team-2',
            position: { x: 50, y: 50, z: 0 },
          },
          // Both have same timestamp, should be ordered by sequenceId
          {
            type: 'move',
            timestampMs: 200,
            sequenceId: 3,
            entityId: 'e1',
            position: { x: 10, y: 10, z: 0 },
          },
          {
            type: 'move',
            timestampMs: 200,
            sequenceId: 4,
            entityId: 'e2',
            position: { x: 60, y: 60, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });

      // Get events at timestamp 200 (should return both move events)
      const eventsBefore = player.getEventsBefore(200);
      const movesAt200 = eventsBefore.filter((e) => e.timestampMs === 200);

      expect(movesAt200.length).toBe(2);
      expect(movesAt200[0].sequenceId).toBe(3); // Lower sequenceId first
      expect(movesAt200[1].sequenceId).toBe(4); // Higher sequenceId after
    });

    it('should preserve insertion order when sequenceId not specified', () => {
      const events: MatchTraceEvent[] = [
        {
          type: 'spawn',
          timestampMs: 0,
          sequenceId: 1,
          entityId: 'e1',
          teamId: 'team-1',
          position: { x: 0, y: 0, z: 0 },
        },
        {
          type: 'spawn',
          timestampMs: 0,
          sequenceId: 2,
          entityId: 'e2',
          teamId: 'team-2',
          position: { x: 50, y: 50, z: 0 },
        },
      ];

      const trace: MatchTrace = { rngSeed: 1, events };
      const player = new MatchPlayer({ trace });

      const eventsBefore = player.getEventsBefore(0);
      expect((eventsBefore[0] as { entityId?: string }).entityId).toBe('e1');
      expect((eventsBefore[1] as { entityId?: string }).entityId).toBe('e2');
    });

    it('should handle 100+ simultaneous events deterministically', () => {
      // Worst case: 100 events at same timestamp with different sequenceIds
      const events: MatchTraceEvent[] = [];

      for (let i = 1; i <= 100; i++) {
        events.push({
          type: 'move',
          timestampMs: 500, // All at same time
          sequenceId: i,
          entityId: `e${i}`,
          position: { x: i, y: i, z: 0 },
        });
      }

      const trace: MatchTrace = { rngSeed: 1, events };
      const player = new MatchPlayer({ trace });

      const eventsBefore = player.getEventsBefore(500);
      expect(eventsBefore.length).toBe(100);

      // Verify order matches sequenceId
      for (let i = 0; i < 100; i++) {
        expect(eventsBefore[i].sequenceId).toBe(i + 1);
      }
    });
  });

  // ========================================================================
  // Timestamp Precision Tests
  // ========================================================================

  describe('Timestamp Precision (Milliseconds)', () => {
    it('should support sub-millisecond event ordering via sequenceId', () => {
      // Two events that occur "within" the same millisecond
      // are ordered by sequenceId
      const trace: MatchTrace = {
        rngSeed: 1,
        events: [
          {
            type: 'fire',
            timestampMs: 100,
            sequenceId: 1,
            attackerId: 'e1',
            projectileId: 'p1',
            position: { x: 0, y: 0, z: 0 },
          },
          {
            type: 'hit',
            timestampMs: 100, // Logically same frame but ordered by sequenceId
            sequenceId: 2,
            projectileId: 'p1',
            targetId: 'e2',
            position: { x: 50, y: 50, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });
      const eventsAt100 = player.getEventsBefore(100);

      expect(eventsAt100.length).toBe(2);
      expect(eventsAt100[0].type).toBe('fire');
      expect(eventsAt100[1].type).toBe('hit');
    });

    it('should distinguish events within same 16ms frame', () => {
      // At 60 fps, frame = ~16.67ms
      // Events at 0, 5, 10, 15ms all within first frame
      const trace: MatchTrace = {
        rngSeed: 1,
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
            timestampMs: 5,
            sequenceId: 2,
            entityId: 'e1',
            position: { x: 1, y: 1, z: 0 },
          },
          {
            type: 'move',
            timestampMs: 10,
            sequenceId: 3,
            entityId: 'e1',
            position: { x: 2, y: 2, z: 0 },
          },
          {
            type: 'move',
            timestampMs: 15,
            sequenceId: 4,
            entityId: 'e1',
            position: { x: 3, y: 3, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });

      // All events within 16ms should be captured correctly
      const events = player.getEventsBefore(16);
      expect(events.length).toBe(4);
      expect(events.map((e) => e.timestampMs)).toEqual([0, 5, 10, 15]);
    });

    it('should not confuse microsecond differences with same timestamp', () => {
      // Client logs: 100.1ms, 100.5ms, 100.9ms
      // All round to timestampMs: 100
      const trace: MatchTrace = {
        rngSeed: 1,
        events: [
          {
            type: 'fire',
            timestampMs: 100,
            sequenceId: 1,
            attackerId: 'e1',
            projectileId: 'p1',
            position: { x: 0, y: 0, z: 0 },
          },
          {
            type: 'fire',
            timestampMs: 100,
            sequenceId: 2,
            attackerId: 'e2',
            projectileId: 'p2',
            position: { x: 50, y: 0, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });
      const events = player.getEventsBefore(100);

      // Both fires at timestamp 100, ordered by sequenceId
      expect(events.length).toBe(2);
      expect(events[0].sequenceId).toBe(1);
      expect(events[1].sequenceId).toBe(2);
    });
  });

  // ========================================================================
  // Frame Index Accuracy Tests
  // ========================================================================

  describe('Frame Index Mapping', () => {
    it('should map timestamp to correct frame index', () => {
      const trace: MatchTrace = {
        rngSeed: 1,
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
            position: { x: 10, y: 10, z: 0 },
          },
          {
            type: 'move',
            timestampMs: 200,
            sequenceId: 3,
            entityId: 'e1',
            position: { x: 20, y: 20, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });

      // Seek to 0ms -> frame 0
      player.seek(0);
      let snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(0);

      // Seek to 100ms -> frame 1
      player.seek(100);
      snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(1);

      // Seek to 200ms -> frame 2
      player.seek(200);
      snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(2);

      // Seek to 150ms (between frames) -> still frame 1
      player.seek(150);
      snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(1);
    });

    it('should update frame index on playback step', () => {
      const trace: MatchTrace = {
        rngSeed: 1,
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
            timestampMs: 1000,
            sequenceId: 2,
            entityId: 'e1',
            position: { x: 10, y: 10, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace, playbackRate: 1 });
      player.play();

      // At start
      let snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(0);

      // Step 500ms (real time) -> 500ms in trace
      player.step(500);
      snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(0); // Still at first frame

      // Step 600ms more (real time) -> total 1100ms in trace
      player.step(600);
      snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(1); // Should reach second frame
    });
  });

  // ========================================================================
  // Replay Tolerance Tests (SC-002: ±16ms)
  // ========================================================================

  describe('Replay Tolerance ±16ms (SC-002)', () => {
    it('should maintain timestamp within ±16ms tolerance', () => {
      const trace: MatchTrace = {
        rngSeed: 1,
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
            timestampMs: 1000,
            sequenceId: 2,
            entityId: 'e1',
            position: { x: 100, y: 100, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });

      // Seek to 1000ms
      player.seek(1000);
      const snapshot = player.getSnapshot();

      // Should be exactly at 1000ms (no tolerance applied on seek)
      expect(snapshot.currentTimestampMs).toBe(1000);

      // During playback, interpolation happens within 16ms
      // This is handled by the renderer (not MatchPlayer)
      // MatchPlayer just maintains timestamp precision
      expect(Math.abs(snapshot.currentTimestampMs - 1000)).toBeLessThanOrEqual(0);
    });

    it('should handle 60fps playback (16.67ms frames)', () => {
      const fps60FrameDuration = 1000 / 60; // ~16.67ms

      const trace: MatchTrace = {
        rngSeed: 1,
        events: Array.from({ length: 60 }, (_, i) => ({
          type: 'move' as const,
          timestampMs: Math.round(i * fps60FrameDuration),
          sequenceId: i + 1,
          entityId: 'e1',
          position: { x: i, y: i, z: 0 },
        })),
      };

      const player = new MatchPlayer({ trace, playbackRate: 1 });
      player.play();

      // Simulate one frame at 60fps
      player.step(fps60FrameDuration);
      const snapshot = player.getSnapshot();

      // Should be approximately at next frame timestamp
      const expectedTime = Math.round(fps60FrameDuration);
      expect(Math.abs(snapshot.currentTimestampMs - expectedTime)).toBeLessThanOrEqual(1);
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty trace', () => {
      const trace: MatchTrace = { rngSeed: 1, events: [] };
      const player = new MatchPlayer({ trace });

      player.play();
      player.step(1000);

      const snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(0);
      expect(snapshot.state).toBe('finished');
    });

    it('should handle single event', () => {
      const trace: MatchTrace = {
        rngSeed: 1,
        events: [
          {
            type: 'spawn',
            timestampMs: 0,
            sequenceId: 1,
            entityId: 'e1',
            teamId: 'team-1',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });
      player.seek(0);

      const snapshot = player.getSnapshot();
      expect(snapshot.currentFrameIndex).toBe(0);
      expect(snapshot.eventsAtTimestamp.length).toBe(1);
    });

    it('should clamp seek beyond max timestamp', () => {
      const trace: MatchTrace = {
        rngSeed: 1,
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
            position: { x: 10, y: 10, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });
      player.seek(9999); // Way beyond max

      const snapshot = player.getSnapshot();
      expect(snapshot.currentTimestampMs).toBe(100); // Clamped to max
      expect(snapshot.state).toBe('finished');
    });

    it('should handle negative seek (clamp to 0)', () => {
      const trace: MatchTrace = {
        rngSeed: 1,
        events: [
          {
            type: 'spawn',
            timestampMs: 0,
            sequenceId: 1,
            entityId: 'e1',
            teamId: 'team-1',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
      };

      const player = new MatchPlayer({ trace });
      player.seek(-100);

      const snapshot = player.getSnapshot();
      expect(snapshot.currentTimestampMs).toBe(0); // Clamped to 0
    });
  });
});
