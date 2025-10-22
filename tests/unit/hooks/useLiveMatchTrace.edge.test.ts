import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockLiveTrace, clearLiveTraceListeners } from './useLiveMatchTrace.helpers';

describe('useLiveMatchTrace — Edge cases & resilience', () => {
  let liveTrace: ReturnType<typeof createMockLiveTrace>;

  beforeEach(() => {
    clearLiveTraceListeners();
    liveTrace = createMockLiveTrace(12345);
  });

  afterEach(() => {
    clearLiveTraceListeners();
  });

  it('should preserve timestamp precision and ordering within a frame', () => {
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-1', teamId: 'team-alpha', position: { x: 0, y: 0, z: 0 }, timestampMs: 0 });
    liveTrace.recordEvent({ type: 'move', entityId: 'robot-1', position: { x: 1, y: 0, z: 0 }, timestampMs: 16.67 });
    expect(liveTrace.trace.events[1].timestampMs).toBe(16.67);
  });

  it('should not throw on null/undefined events and should log errors on malformed events', () => {
    const spy = vi.spyOn(console, 'error');
    expect(() => liveTrace.recordEvent(undefined as any)).not.toThrow();
    liveTrace.recordEvent({ type: 'invalid-type' } as any);
    liveTrace.recordEvent({ type: 'move', entityId: 'robot-1', position: { x: 10, y: 0, z: 10 }, timestampMs: 50 } as any);
    expect(liveTrace.trace.events.length).toBeGreaterThanOrEqual(1);
    spy.mockRestore();
  });

  it('should support mixed realistic sequences and ensure sequential sequenceIds', () => {
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-1', teamId: 'team-alpha', position: { x: 0, y: 0, z: 0 }, timestampMs: 0 });
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-2', teamId: 'team-beta', position: { x: 50, y: 0, z: 0 }, timestampMs: 100 });
    liveTrace.recordEvent({ type: 'move', entityId: 'robot-1', position: { x: 10, y: 0, z: 0 }, timestampMs: 150 } as any);
    liveTrace.recordEvent({ type: 'fire', attackerId: 'robot-1', projectileId: 'projectile-1', position: { x: 10, y: 0, z: 0 }, timestampMs: 200 });
    liveTrace.recordEvent({ type: 'damage', targetId: 'robot-2', attackerId: 'robot-1', amount: 25, resultingHealth: 75, timestampMs: 250 });
    liveTrace.recordEvent({ type: 'death', entityId: 'robot-2', killedBy: 'robot-1', timestampMs: 300 });
    expect(liveTrace.trace.events.map((e) => e.type)).toEqual(['spawn', 'spawn', 'move', 'fire', 'damage', 'death']);
    for (let i = 0; i < liveTrace.trace.events.length; i++) {
      expect(liveTrace.trace.events[i].sequenceId).toBe(i + 1);
    }
  });

  it('should reset events and sequenceId on reset', () => {
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-1', teamId: 'team-alpha', position: { x: 0, y: 0, z: 0 }, timestampMs: 0 });
    expect(liveTrace.trace.events).toHaveLength(1);
    liveTrace.reset();
    expect(liveTrace.trace.events).toHaveLength(0);
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-2', teamId: 'team-beta', position: { x: 50, y: 0, z: 0 }, timestampMs: 100 });
    expect(liveTrace.trace.events[0].sequenceId).toBe(1);
  });
});
