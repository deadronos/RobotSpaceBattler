import type { MatchTrace, MatchTraceEvent } from '../../src/systems/matchTrace/types';

export function createSpawn(entityId = 'e1', seq = 1, t = 0): MatchTraceEvent {
  return {
    type: 'spawn',
    timestampMs: t,
    sequenceId: seq,
    entityId,
    teamId: 'team-1',
    position: { x: 0, y: 0, z: 0 },
  } as MatchTraceEvent;
}

export function createMove(entityId = 'e1', seq = 1, t = 0, x = 0, y = 0): MatchTraceEvent {
  return {
    type: 'move',
    timestampMs: t,
    sequenceId: seq,
    entityId,
    position: { x, y, z: 0 },
  } as MatchTraceEvent;
}

export function createFire(attackerId = 'e1', projectileId = 'p1', seq = 1, t = 100): MatchTraceEvent {
  return {
    type: 'fire',
    timestampMs: t,
    sequenceId: seq,
    attackerId,
    projectileId,
    position: { x: 0, y: 0, z: 0 },
  } as MatchTraceEvent;
}

export function createHit(projectileId = 'p1', targetId = 'e2', seq = 2, t = 100): MatchTraceEvent {
  return {
    type: 'hit',
    timestampMs: t,
    sequenceId: seq,
    projectileId,
    targetId,
    position: { x: 0, y: 0, z: 0 },
  } as MatchTraceEvent;
}

export function makeTrace(events: MatchTraceEvent[], seed = 1): MatchTrace {
  return { rngSeed: seed, events } as MatchTrace;
}
