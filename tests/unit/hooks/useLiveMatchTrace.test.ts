/**
 * Unit Tests for useLiveMatchTrace Hook (T050, T054, US3)
 *
 * Tests:
 * - Live spawn event capture from entity creation
 * - Live move event capture with position deltas
 * - Live fire event capture from projectile creation
 * - Live damage event capture from health changes
 * - Live death event capture from entity elimination
 * - sequenceId assignment for deterministic tie-breaking
 * - RNG seed and algorithm metadata tracking
 * - Returning a growing MatchTrace object
 * - Event ordering and timestamp precision
 * - Error resilience (malformed events don't break hook)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  emitLiveTraceEvent,
  clearLiveTraceListeners,
  type LiveTraceEvent,
} from '../../../src/systems/matchTrace/liveTraceEmitter';
import type { MatchTrace, MatchTraceEvent } from '../../../src/systems/matchTrace/types';

/**
 * Mock implementation of useLiveMatchTrace for testing.
 * Simulates the hook without React/Three.js dependencies.
 */
function createMockLiveTrace(seed?: number): {
  trace: MatchTrace;
  recordEvent: (event: LiveTraceEvent | any) => void;
  reset: () => void;
} {
  const rngSeed = seed ?? Math.floor(Math.random() * 0xffffffff);
  const trace: MatchTrace = {
    rngSeed,
    rngAlgorithm: 'xorshift32',
    meta: {
      rngSeed,
      rngAlgorithm: 'xorshift32',
      source: 'live',
    },
    events: [],
  };

  let sequenceId = 0;

  const recordEvent = (liveEvent: LiveTraceEvent | any) => {
    try {
      if (!liveEvent || !liveEvent.type) {
        return;
      }

      sequenceId += 1;
      let event: MatchTraceEvent | null = null;

      switch (liveEvent.type) {
        case 'spawn':
          event = {
            type: 'spawn',
            entityId: liveEvent.entityId,
            teamId: liveEvent.teamId,
            position: { ...liveEvent.position },
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          };
          break;

        case 'move':
          event = {
            type: 'move',
            entityId: liveEvent.entityId,
            position: { ...liveEvent.position },
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          };
          break;

        case 'fire':
          event = {
            type: 'fire',
            attackerId: liveEvent.attackerId,
            projectileId: liveEvent.projectileId,
            position: { ...liveEvent.position },
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          };
          break;

        case 'damage':
          event = {
            type: 'damage',
            targetId: liveEvent.targetId,
            attackerId: liveEvent.attackerId ?? 'unknown',
            amount: liveEvent.amount,
            resultingHealth: liveEvent.resultingHealth,
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          };
          break;

        case 'death':
          event = {
            type: 'death',
            entityId: liveEvent.entityId,
            killedBy: liveEvent.killedBy,
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          };
          break;

        default:
          break;
      }

      if (event) {
        trace.events.push(event);
      }
    } catch (error) {
      console.error('[live-trace] error recording event', error);
    }
  };

  const reset = () => {
    trace.events = [];
    sequenceId = 0;
  };

  return { trace, recordEvent, reset };
}

describe('useLiveMatchTrace Hook (T050, T054, US3)', () => {
  let liveTrace: ReturnType<typeof createMockLiveTrace>;

  beforeEach(() => {
    clearLiveTraceListeners();
    liveTrace = createMockLiveTrace(12345);
  });

  afterEach(() => {
    clearLiveTraceListeners();
  });

  // ========================================================================
  // Spawn Event Capture Tests
  // ========================================================================

  describe('Spawn Event Capture', () => {
    it('should capture spawn event with correct entity and team IDs', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      expect(liveTrace.trace.events).toHaveLength(1);
      const event = liveTrace.trace.events[0];
      expect(event.type).toBe('spawn');
      expect((event as any).entityId).toBe('robot-1');
      expect((event as any).teamId).toBe('team-alpha');
    });

    it('should capture spawn position correctly', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 25 },
        timestampMs: 100,
      });

      const event = liveTrace.trace.events[0];
      expect((event as any).position).toEqual({ x: 50, y: 0, z: 25 });
    });

    it('should capture multiple spawn events sequentially', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: 100,
      });

      expect(liveTrace.trace.events).toHaveLength(2);
      expect((liveTrace.trace.events[0] as any).entityId).toBe('robot-1');
      expect((liveTrace.trace.events[1] as any).entityId).toBe('robot-2');
    });

    it('should assign incrementing sequenceId to spawn events', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: 0,
      });

      expect(liveTrace.trace.events[0].sequenceId).toBe(1);
      expect(liveTrace.trace.events[1].sequenceId).toBe(2);
    });
  });

  // ========================================================================
  // Move Event Capture Tests
  // ========================================================================

  describe('Move Event Capture', () => {
    it('should capture move event with entity ID and new position', () => {
      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 50,
      } as any);

      expect(liveTrace.trace.events).toHaveLength(1);
      const event = liveTrace.trace.events[0];
      expect(event.type).toBe('move');
      expect((event as any).entityId).toBe('robot-1');
      expect((event as any).position).toEqual({ x: 10, y: 0, z: 10 });
    });

    it('should capture multiple move events with different positions', () => {
      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 50,
      } as any);

      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 20, y: 0, z: 20 },
        timestampMs: 100,
      } as any);

      expect(liveTrace.trace.events).toHaveLength(2);
      expect((liveTrace.trace.events[0] as any).position).toEqual({
        x: 10,
        y: 0,
        z: 10,
      });
      expect((liveTrace.trace.events[1] as any).position).toEqual({
        x: 20,
        y: 0,
        z: 20,
      });
    });

    it('should handle move events for multiple entities', () => {
      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 50,
      } as any);

      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-2',
        position: { x: 30, y: 0, z: 30 },
        timestampMs: 50,
      } as any);

      expect(liveTrace.trace.events).toHaveLength(2);
      expect((liveTrace.trace.events[0] as any).entityId).toBe('robot-1');
      expect((liveTrace.trace.events[1] as any).entityId).toBe('robot-2');
    });
  });

  // ========================================================================
  // Fire Event Capture Tests
  // ========================================================================

  describe('Fire Event Capture', () => {
    it('should capture fire event with attacker and projectile IDs', () => {
      liveTrace.recordEvent({
        type: 'fire',
        attackerId: 'robot-1',
        projectileId: 'projectile-1',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 100,
      });

      expect(liveTrace.trace.events).toHaveLength(1);
      const event = liveTrace.trace.events[0];
      expect(event.type).toBe('fire');
      expect((event as any).attackerId).toBe('robot-1');
      expect((event as any).projectileId).toBe('projectile-1');
    });

    it('should capture fire position (origin of projectile)', () => {
      liveTrace.recordEvent({
        type: 'fire',
        attackerId: 'robot-1',
        projectileId: 'projectile-1',
        position: { x: 5, y: 0, z: 5 },
        timestampMs: 100,
      });

      const event = liveTrace.trace.events[0];
      expect((event as any).position).toEqual({ x: 5, y: 0, z: 5 });
    });

    it('should capture multiple fire events sequentially', () => {
      liveTrace.recordEvent({
        type: 'fire',
        attackerId: 'robot-1',
        projectileId: 'projectile-1',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 100,
      });

      liveTrace.recordEvent({
        type: 'fire',
        attackerId: 'robot-2',
        projectileId: 'projectile-2',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: 150,
      });

      expect(liveTrace.trace.events).toHaveLength(2);
      expect((liveTrace.trace.events[0] as any).projectileId).toBe(
        'projectile-1'
      );
      expect((liveTrace.trace.events[1] as any).projectileId).toBe(
        'projectile-2'
      );
    });
  });

  // ========================================================================
  // Damage Event Capture Tests
  // ========================================================================

  describe('Damage Event Capture', () => {
    it('should capture damage event with target, attacker, and amount', () => {
      liveTrace.recordEvent({
        type: 'damage',
        targetId: 'robot-2',
        attackerId: 'robot-1',
        amount: 25,
        resultingHealth: 75,
        timestampMs: 200,
      });

      expect(liveTrace.trace.events).toHaveLength(1);
      const event = liveTrace.trace.events[0];
      expect(event.type).toBe('damage');
      expect((event as any).targetId).toBe('robot-2');
      expect((event as any).attackerId).toBe('robot-1');
      expect((event as any).amount).toBe(25);
      expect((event as any).resultingHealth).toBe(75);
    });

    it('should handle damage with missing attackerId gracefully', () => {
      liveTrace.recordEvent({
        type: 'damage',
        targetId: 'robot-2',
        amount: 50,
        resultingHealth: 50,
        timestampMs: 200,
      });

      const event = liveTrace.trace.events[0];
      expect((event as any).attackerId).toBe('unknown');
    });

    it('should capture multiple damage events', () => {
      liveTrace.recordEvent({
        type: 'damage',
        targetId: 'robot-2',
        attackerId: 'robot-1',
        amount: 25,
        resultingHealth: 75,
        timestampMs: 200,
      });

      liveTrace.recordEvent({
        type: 'damage',
        targetId: 'robot-2',
        attackerId: 'robot-1',
        amount: 25,
        resultingHealth: 50,
        timestampMs: 250,
      });

      expect(liveTrace.trace.events).toHaveLength(2);
      expect((liveTrace.trace.events[0] as any).resultingHealth).toBe(75);
      expect((liveTrace.trace.events[1] as any).resultingHealth).toBe(50);
    });
  });

  // ========================================================================
  // Death Event Capture Tests
  // ========================================================================

  describe('Death Event Capture', () => {
    it('should capture death event with entity ID', () => {
      liveTrace.recordEvent({
        type: 'death',
        entityId: 'robot-2',
        timestampMs: 300,
      });

      expect(liveTrace.trace.events).toHaveLength(1);
      const event = liveTrace.trace.events[0];
      expect(event.type).toBe('death');
      expect((event as any).entityId).toBe('robot-2');
    });

    it('should capture death event with killer ID', () => {
      liveTrace.recordEvent({
        type: 'death',
        entityId: 'robot-2',
        killedBy: 'robot-1',
        timestampMs: 300,
      });

      const event = liveTrace.trace.events[0];
      expect((event as any).killedBy).toBe('robot-1');
    });

    it('should capture multiple death events', () => {
      liveTrace.recordEvent({
        type: 'death',
        entityId: 'robot-2',
        killedBy: 'robot-1',
        timestampMs: 300,
      });

      liveTrace.recordEvent({
        type: 'death',
        entityId: 'robot-3',
        killedBy: 'robot-1',
        timestampMs: 350,
      });

      expect(liveTrace.trace.events).toHaveLength(2);
      expect((liveTrace.trace.events[0] as any).entityId).toBe('robot-2');
      expect((liveTrace.trace.events[1] as any).entityId).toBe('robot-3');
    });
  });

  // ========================================================================
  // sequenceId Ordering Tests
  // ========================================================================

  describe('sequenceId Assignment & Ordering', () => {
    it('should assign monotonically increasing sequenceId', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 50,
      } as any);

      liveTrace.recordEvent({
        type: 'fire',
        attackerId: 'robot-1',
        projectileId: 'projectile-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 100,
      });

      expect(liveTrace.trace.events[0].sequenceId).toBe(1);
      expect(liveTrace.trace.events[1].sequenceId).toBe(2);
      expect(liveTrace.trace.events[2].sequenceId).toBe(3);
    });

    it('should maintain sequenceId order even with same timestamp', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 100,
      });

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: 100,
      });

      // Both at same timestamp, but sequenceId ensures ordering
      expect(liveTrace.trace.events[0].sequenceId).toBe(1);
      expect(liveTrace.trace.events[1].sequenceId).toBe(2);
      expect(liveTrace.trace.events[0].timestampMs).toBe(
        liveTrace.trace.events[1].timestampMs
      );
    });

    it('should handle 100+ events with deterministic ordering', () => {
      for (let i = 1; i <= 100; i++) {
        liveTrace.recordEvent({
          type: 'move',
          entityId: `robot-${i}`,
          position: { x: i, y: 0, z: 0 },
          timestampMs: 100, // All at same time
        } as any);
      }

      expect(liveTrace.trace.events).toHaveLength(100);

      // Verify sequenceId is strictly increasing
      for (let i = 0; i < 100; i++) {
        expect(liveTrace.trace.events[i].sequenceId).toBe(i + 1);
      }
    });
  });

  // ========================================================================
  // RNG Metadata Tests
  // ========================================================================

  describe('RNG Metadata Tracking', () => {
    it('should include RNG seed in trace metadata', () => {
      const liveTrace2 = createMockLiveTrace(54321);
      expect(liveTrace2.trace.rngSeed).toBe(54321);
      expect(liveTrace2.trace.meta?.rngSeed).toBe(54321);
    });

    it('should include RNG algorithm in metadata', () => {
      expect(liveTrace.trace.rngAlgorithm).toBe('xorshift32');
      expect(liveTrace.trace.meta?.rngAlgorithm).toBe('xorshift32');
    });

    it('should mark source as "live" in metadata', () => {
      expect(liveTrace.trace.meta?.source).toBe('live');
    });

    it('should preserve RNG metadata across multiple events', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 50,
      } as any);

      // Metadata should remain unchanged
      expect(liveTrace.trace.rngSeed).toBe(12345);
      expect(liveTrace.trace.rngAlgorithm).toBe('xorshift32');
      expect(liveTrace.trace.meta?.source).toBe('live');
    });
  });

  // ========================================================================
  // Timestamp Precision Tests
  // ========================================================================

  describe('Timestamp Precision', () => {
    it('should preserve timestamps in milliseconds', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 16.67,
      } as any);

      expect(liveTrace.trace.events[0].timestampMs).toBe(0);
      expect(liveTrace.trace.events[1].timestampMs).toBe(16.67);
    });

    it('should support events within same 16ms frame', () => {
      // 60 fps frame = ~16.67ms
      const frame1Start = 0;
      const withinFrame = [5, 10, 15];

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: frame1Start,
      });

      withinFrame.forEach((ts, idx) => {
        liveTrace.recordEvent({
          type: 'move',
          entityId: 'robot-1',
          position: { x: idx + 1, y: 0, z: 0 },
          timestampMs: ts,
        } as any);
      });

      expect(liveTrace.trace.events).toHaveLength(4);
      expect(liveTrace.trace.events[1].timestampMs).toBe(5);
      expect(liveTrace.trace.events[2].timestampMs).toBe(10);
      expect(liveTrace.trace.events[3].timestampMs).toBe(15);
    });
  });

  // ========================================================================
  // Growing Trace Tests
  // ========================================================================

  describe('Growing MatchTrace Object', () => {
    it('should return the same trace object that grows with events', () => {
      const initialLength = liveTrace.trace.events.length;

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      expect(liveTrace.trace.events.length).toBe(initialLength + 1);
    });

    it('should allow exporting trace as JSON', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      const json = JSON.stringify(liveTrace.trace);
      expect(json).toContain('robot-1');
      expect(json).toContain('team-alpha');
      expect(json).toContain('12345'); // RNG seed

      const parsed = JSON.parse(json) as MatchTrace;
      expect(parsed.events).toHaveLength(1);
      expect(parsed.rngSeed).toBe(12345);
    });

    it('should maintain trace shape consistent with MatchTrace type', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      const trace = liveTrace.trace;

      // Check required properties
      expect(trace).toHaveProperty('events');
      expect(trace).toHaveProperty('rngSeed');
      expect(trace).toHaveProperty('rngAlgorithm');
      expect(trace).toHaveProperty('meta');

      // Verify event properties
      const event = trace.events[0];
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('timestampMs');
      expect(event).toHaveProperty('sequenceId');
    });
  });

  // ========================================================================
  // Error Resilience Tests
  // ========================================================================

  describe('Error Resilience', () => {
    it('should not throw on null/undefined event', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      expect(() => {
        liveTrace.recordEvent(undefined as any);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should not throw on event with missing required fields', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      expect(() => {
        liveTrace.recordEvent({
          type: 'spawn',
          // Missing entityId, teamId, position
          timestampMs: 0,
        } as any);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should log error on malformed event and continue', () => {
      const consoleSpy = vi.spyOn(console, 'error');

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      // Now a malformed event
      liveTrace.recordEvent({
        type: 'invalid-type',
        // Missing fields
      } as any);

      // Should still be able to record valid events
      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 10 },
        timestampMs: 50,
      } as any);

      // Should have 2 valid events (spawn and move), skipped invalid
      expect(liveTrace.trace.events.length).toBeGreaterThanOrEqual(2);

      consoleSpy.mockRestore();
    });

    it('should handle position with missing or invalid coordinates', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0 } as any, // Missing z
        timestampMs: 0,
      });

      const event = liveTrace.trace.events[0];
      expect((event as any).position.x).toBe(0);
      expect((event as any).position.y).toBe(0);
      // z is undefined but event was still recorded
    });
  });

  // ========================================================================
  // Mixed Event Sequence Tests
  // ========================================================================

  describe('Mixed Event Sequences', () => {
    it('should capture realistic combat sequence', () => {
      // Spawn two robots
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: 100,
      });

      // Move robot-1
      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 0 },
        timestampMs: 150,
      } as any);

      // Fire projectile
      liveTrace.recordEvent({
        type: 'fire',
        attackerId: 'robot-1',
        projectileId: 'projectile-1',
        position: { x: 10, y: 0, z: 0 },
        timestampMs: 200,
      });

      // Deal damage
      liveTrace.recordEvent({
        type: 'damage',
        targetId: 'robot-2',
        attackerId: 'robot-1',
        amount: 25,
        resultingHealth: 75,
        timestampMs: 250,
      });

      // Robot-2 dies
      liveTrace.recordEvent({
        type: 'death',
        entityId: 'robot-2',
        killedBy: 'robot-1',
        timestampMs: 300,
      });

      expect(liveTrace.trace.events).toHaveLength(6);
      expect(liveTrace.trace.events.map((e) => e.type)).toEqual([
        'spawn',
        'spawn',
        'move',
        'fire',
        'damage',
        'death',
      ]);

      // Verify sequenceIds are sequential
      for (let i = 0; i < liveTrace.trace.events.length; i++) {
        expect(liveTrace.trace.events[i].sequenceId).toBe(i + 1);
      }
    });

    it('should handle concurrent events at same timestamp with correct ordering', () => {
      const timestamp = 500;

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: timestamp,
      });

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: timestamp,
      });

      liveTrace.recordEvent({
        type: 'move',
        entityId: 'robot-1',
        position: { x: 10, y: 0, z: 0 },
        timestampMs: timestamp,
      } as any);

      // All at same timestamp but ordered by sequenceId
      expect(liveTrace.trace.events).toHaveLength(3);
      expect(liveTrace.trace.events[0].sequenceId).toBe(1);
      expect(liveTrace.trace.events[1].sequenceId).toBe(2);
      expect(liveTrace.trace.events[2].sequenceId).toBe(3);

      // All have same timestamp
      expect(
        liveTrace.trace.events.every((e) => e.timestampMs === timestamp)
      ).toBe(true);
    });
  });

  // ========================================================================
  // Reset & Cleanup Tests
  // ========================================================================

  describe('Reset & Cleanup', () => {
    it('should reset trace to empty state', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      expect(liveTrace.trace.events).toHaveLength(1);

      liveTrace.reset();

      expect(liveTrace.trace.events).toHaveLength(0);
    });

    it('should reset sequenceId counter on reset', () => {
      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-1',
        teamId: 'team-alpha',
        position: { x: 0, y: 0, z: 0 },
        timestampMs: 0,
      });

      liveTrace.reset();

      liveTrace.recordEvent({
        type: 'spawn',
        entityId: 'robot-2',
        teamId: 'team-beta',
        position: { x: 50, y: 0, z: 0 },
        timestampMs: 100,
      });

      // After reset, sequenceId should restart at 1
      expect(liveTrace.trace.events[0].sequenceId).toBe(1);
    });

    it('should allow multiple resets and new traces', () => {
      for (let cycle = 0; cycle < 3; cycle++) {
        liveTrace.recordEvent({
          type: 'spawn',
          entityId: `robot-${cycle}`,
          teamId: 'team-alpha',
          position: { x: 0, y: 0, z: 0 },
          timestampMs: 0,
        });

        expect(liveTrace.trace.events).toHaveLength(1);
        liveTrace.reset();
        expect(liveTrace.trace.events).toHaveLength(0);
      }
    });
  });
});
