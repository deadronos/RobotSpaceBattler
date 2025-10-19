import { describe, it, expect, beforeEach } from 'vitest';
import { EntityMapper, entityStateFromUnit, filterVisibleEntities } from '../../../src/systems/matchTrace/entityMapper';
import {
  createSpawnEvent,
  createMoveEvent,
  createDamageEvent,
  createDeathEvent,
  createPosition,
  createUnit,
} from './entityMapper.test.helpers';
import type { MatchTraceEvent } from '../../../src/systems/matchTrace/types';

describe('EntityMapper - complex scenarios & helpers', () => {
  let mapper: EntityMapper;

  beforeEach(() => {
    mapper = new EntityMapper();
  });

  it('should handle full match lifecycle with all event types', () => {
    const events: MatchTraceEvent[] = [
      createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
      createSpawnEvent('robot-2', 'team-a', createPosition(1, 0, 0), 0),
      createSpawnEvent('robot-3', 'team-b', createPosition(10, 0, 0), 0),
      createMoveEvent('robot-1', createPosition(2, 0, 0), 100),
      createMoveEvent('robot-3', createPosition(8, 0, 0), 100),
      createDamageEvent('robot-3', 'robot-1', 30, 70, 300),
      createDamageEvent('robot-3', 'robot-1', 40, 30, 350),
      createDeathEvent('robot-3', 'robot-1', 400),
    ];

    mapper.updateFromEvents(events, 400, 0);

    expect(mapper.getAliveEntities().length).toBe(2);
    const robot3 = mapper.getEntity('robot-3');
    expect(robot3?.isAlive).toBe(false);
  });

  it('should create EntityState from Unit', () => {
    const unit = createUnit('unit-1', 'team-a', 100, 'model:robot-v1');
    const position = createPosition(5, 10, 15);

    const state = entityStateFromUnit(unit, 1000, position);

    expect(state.id).toBe('unit-1');
    expect(state.teamId).toBe('team-a');
    expect(state.position).toEqual(position);
  });

  it('should filter out dead entities', () => {
    const entities = [
      entityStateFromUnit(createUnit('r1', 'team-a', 100), 0, createPosition()),
      { ...entityStateFromUnit(createUnit('r2', 'team-a', 100), 0, createPosition()), isAlive: false, diedAt: 100 },
      entityStateFromUnit(createUnit('r3', 'team-b', 100), 0, createPosition()),
    ];

    const visible = filterVisibleEntities(entities as any);
    expect(visible.length).toBe(2);
  });
});
