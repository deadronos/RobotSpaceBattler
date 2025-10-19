import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMockLiveTrace, clearLiveTraceListeners } from './useLiveMatchTrace.helpers';

describe('useLiveMatchTrace — Initialization & RNG metadata', () => {
  let liveTrace: ReturnType<typeof createMockLiveTrace>;

  beforeEach(() => {
    clearLiveTraceListeners();
    liveTrace = createMockLiveTrace(12345);
  });

  afterEach(() => {
    clearLiveTraceListeners();
  });

  it('should initialize trace with provided RNG seed and metadata', () => {
    expect(liveTrace.trace.rngSeed).toBe(12345);
    expect(liveTrace.trace.rngAlgorithm).toBe('xorshift32');
    expect(liveTrace.trace.meta?.source).toBe('live');
  });

  it('should return a growing trace object when events are recorded', () => {
    const initialLength = liveTrace.trace.events.length;
    liveTrace.recordEvent({ type: 'spawn', entityId: 'robot-1', teamId: 'team-alpha', position: { x: 0, y: 0, z: 0 }, timestampMs: 0 });
    expect(liveTrace.trace.events.length).toBe(initialLength + 1);
  });
});
