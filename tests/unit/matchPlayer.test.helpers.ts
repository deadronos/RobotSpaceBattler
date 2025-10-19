import type { MatchTrace, MatchTraceEvent } from '../../src/systems/matchTrace/types';

// Helper to create a minimal trace with events
export const createTestTrace = (events: MatchTraceEvent[]): MatchTrace => ({
  rngSeed: 12345,
  events,
});

// Helper to create spawn event
export const createSpawnEvent = (
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
export const createMoveEvent = (
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
export const createFireEvent = (
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
