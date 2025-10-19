import { clearLiveTraceListeners } from '../../../src/systems/matchTrace/liveTraceEmitter';
import type { MatchTrace, MatchTraceEvent } from '../../../src/systems/matchTrace/types';

/**
 * Mock implementation of useLiveMatchTrace for testing.
 * Simulates the hook without React/Three.js dependencies.
 */
export function createMockLiveTrace(seed?: number): {
  trace: MatchTrace;
  recordEvent: (event: any) => void;
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

  const recordEvent = (liveEvent: any) => {
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
          } as any;
          break;

        case 'move':
          event = {
            type: 'move',
            entityId: liveEvent.entityId,
            position: { ...liveEvent.position },
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          } as any;
          break;

        case 'fire':
          event = {
            type: 'fire',
            attackerId: liveEvent.attackerId,
            projectileId: liveEvent.projectileId,
            position: { ...liveEvent.position },
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          } as any;
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
          } as any;
          break;

        case 'death':
          event = {
            type: 'death',
            entityId: liveEvent.entityId,
            killedBy: liveEvent.killedBy,
            timestampMs: liveEvent.timestampMs,
            sequenceId,
          } as any;
          break;

        default:
          break;
      }

      if (event) {
        trace.events.push(event as any);
      }
    } catch (error) {
      // Keep tests deterministic: don't rethrow
      console.error('[live-trace] error recording event', error);
    }
  };

  const reset = () => {
    trace.events = [];
    sequenceId = 0;
  };

  return { trace, recordEvent, reset };
}

export { clearLiveTraceListeners };
