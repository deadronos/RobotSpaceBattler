import { describe, it, expect, beforeEach } from 'vitest';
import { EntityMapper } from '../../../src/systems/matchTrace/entityMapper';
import {
  createSpawnEvent,
  createMoveEvent,
  createDamageEvent,
  createDeathEvent,
  createPosition,
} from './entityMapper.test.helpers';
import type { MatchTraceEvent } from '../../../src/systems/matchTrace/types';

describe('EntityMapper - basic events', () => {
  let mapper: EntityMapper;

  beforeEach(() => {
    mapper = new EntityMapper();
  });

  describe('Spawn Event Processing', () => {
    it('should create entity from spawn event', () => {
      const event = createSpawnEvent();
      mapper.updateFromEvents([event], 0, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity).toBeDefined();
      expect(entity?.id).toBe('robot-1');
    });

    it('should set entity position from spawn event', () => {
      const position = createPosition(10, 20, 30);
      const event = createSpawnEvent('robot-1', 'team-a', position);
      mapper.updateFromEvents([event], 0, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(position);
    });
  });

  describe('Move Event Processing', () => {
    it('should update entity position from move event', () => {
      const spawnEvent = createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0);
      const moveEvent = createMoveEvent('robot-1', createPosition(5, 10, 15), 100);

      mapper.updateFromEvents([spawnEvent, moveEvent], 100, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(createPosition(5, 10, 15));
    });
  });

  describe('Damage & Death Processing', () => {
    it('should update entity health from damage event', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDamageEvent('robot-1', 'robot-2', 10, 90, 100),
      ];
      mapper.updateFromEvents(events, 100, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.currentHealth).toBe(90);
    });

    it('should mark entity as dead from death event', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDeathEvent('robot-1', 'robot-2', 300),
      ];
      mapper.updateFromEvents(events, 300, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.isAlive).toBe(false);
    });
  });
});
