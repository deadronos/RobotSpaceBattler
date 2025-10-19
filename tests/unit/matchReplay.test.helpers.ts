import type { MatchTrace, MatchTraceEvent } from '../../src/systems/matchTrace/types';
import { RNG_ALGORITHM_ID } from '../../src/systems/matchTrace/rngManager';

export function createSpawnEvent(id: string, timestamp: number): MatchTraceEvent {
  return {
    type: 'spawn',
    timestampMs: timestamp,
    sequenceId: 1,
    entityId: id,
    teamId: 'team-1',
    position: { x: 0, y: 0, z: 0 },
  } as MatchTraceEvent;
}

export function makeTraceWithSeed(events: MatchTraceEvent[], seed = 42): MatchTrace {
  return {
    rngSeed: seed,
    rngAlgorithm: RNG_ALGORITHM_ID,
    events,
  } as MatchTrace;
}

export function makeSimpleTrace(): MatchTrace {
  return makeTraceWithSeed([
    createSpawnEvent('e1', 0),
    createSpawnEvent('e2', 100),
  ]);
}
