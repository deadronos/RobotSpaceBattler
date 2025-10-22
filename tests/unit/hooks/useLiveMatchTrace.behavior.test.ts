import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockLiveTrace, clearLiveTraceListeners } from './useLiveMatchTrace.helpers';

describe('useLiveMatchTrace — Event behavior', () => {
  let liveTrace: ReturnType<typeof createMockLiveTrace>;

  beforeEach(() => {
    clearLiveTraceListeners();
    liveTrace = createMockLiveTrace(12345);
  });

  afterEach(() => {
    clearLiveTraceListeners();
  });

  it('should capture spawn events with entity/team and position', () => {
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-1', teamId: 'team-alpha', position: { x: 0, y: 0, z: 0 }, timestampMs: 0 });
    expect(liveTrace.trace.events).toHaveLength(1);
    expect((liveTrace.trace.events[0] as any).entityId).toBe('robot-1');
  });

  it('should capture move events with positions', () => {
    liveTrace.recordEvent({ type: 'move', entityId: 'robot-1', position: { x: 10, y: 0, z: 10 }, timestampMs: 50 });
    expect(liveTrace.trace.events[0].type).toBe('move');
  });

  it('should capture fire events with attacker and projectile IDs', () => {
    liveTrace.recordEvent({ type: 'fire', attackerId: 'robot-1', projectileId: 'projectile-1', position: { x: 5, y: 0, z: 5 }, timestampMs: 100 });
    expect((liveTrace.trace.events[0] as any).projectileId).toBe('projectile-1');
  });

  it('should capture damage events and default missing attacker to unknown', () => {
    liveTrace.recordEvent({ type: 'damage', targetId: 'robot-2', amount: 25, resultingHealth: 75, timestampMs: 200 });
    expect((liveTrace.trace.events[0] as any).attackerId).toBe('unknown');
  });

  it('should capture death events and killer ID when provided', () => {
    liveTrace.recordEvent({ type: 'death', entityId: 'robot-2', killedBy: 'robot-1', timestampMs: 300 });
    expect((liveTrace.trace.events[0] as any).killedBy).toBe('robot-1');
  });

  it('should assign monotonic sequenceId across event types', () => {
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-1', teamId: 'team-alpha', position: { x: 0, y: 0, z: 0 }, timestampMs: 0 });
    liveTrace.recordEvent({ type: 'move', entityId: 'robot-1', position: { x: 1, y: 0, z: 0 }, timestampMs: 10 });
    liveTrace.recordEvent({ type: 'fire', attackerId: 'robot-1', projectileId: 'p1', position: { x: 1, y: 0, z: 0 }, timestampMs: 20 });
    expect(liveTrace.trace.events[0].sequenceId).toBe(1);
    expect(liveTrace.trace.events[1].sequenceId).toBe(2);
    expect(liveTrace.trace.events[2].sequenceId).toBe(3);
  });
});
