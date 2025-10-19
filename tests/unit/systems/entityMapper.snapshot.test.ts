import { describe, it, expect, beforeEach } from 'vitest';
import { EntityMapper } from '../../../src/systems/matchTrace/entityMapper';
import {
  createSpawnEvent,
  createMoveEvent,
  createDeathEvent,
  createPosition,
} from './entityMapper.test.helpers';
import type { MatchTraceEvent } from '../../../src/systems/matchTrace/types';

describe('EntityMapper - snapshots & queries', () => {
  let mapper: EntityMapper;

  beforeEach(() => {
    mapper = new EntityMapper();
  });

  it('should return EntitySnapshot with correct structure', () => {
    const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
    const snapshot = mapper.updateFromEvents([event], 0, 0);

    expect(snapshot).toBeDefined();
    expect(snapshot.entities).toBeInstanceOf(Map);
    expect(snapshot.timestamp).toBe(0);
  });

  it('should include all current entities in snapshot', () => {
    const events: MatchTraceEvent[] = [
      createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
      createSpawnEvent('robot-2', 'team-b', createPosition(), 0),
      createSpawnEvent('robot-3', 'team-a', createPosition(), 0),
    ];
    const snapshot = mapper.updateFromEvents(events, 0, 0);

    expect(snapshot.entities.size).toBe(3);
  });

  it('should get entities by team ID', () => {
    const events: MatchTraceEvent[] = [
      createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
      createSpawnEvent('robot-2', 'team-a', createPosition(), 0),
      createSpawnEvent('robot-3', 'team-b', createPosition(), 0),
      createDeathEvent('robot-2', 'robot-1', 100),
    ];
    mapper.updateFromEvents(events, 100, 0);

    const teamA = mapper.getEntitiesByTeam('team-a');
    expect(teamA.length).toBe(2);
  });

  it('should clear all entities on reset', () => {
    const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
    mapper.updateFromEvents([event], 0, 0);
    expect(mapper.getAllEntities().length).toBe(1);

    mapper.reset();
    expect(mapper.getAllEntities().length).toBe(0);
  });
});
