/**
 * EntityMapper Tests (T026, US1)
 *
 * Comprehensive unit tests for entity state mapping from MatchTrace events.
 * Tests the transformation of simulation events into renderable entity snapshots.
 *
 * Coverage:
 * - Spawn event processing and entity creation
 * - Move events and position updates
 * - Damage events and health tracking
 * - Death events and lifecycle
 * - Snapshot generation and caching
 * - Entity queries (all, alive, by team)
 * - Reset and cleanup
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EntityMapper,
  EntityState,
  EntitySnapshot,
  entityStateFromUnit,
  filterVisibleEntities,
} from '../../../src/systems/matchTrace/entityMapper';
import type {
  SpawnEvent,
  MoveEvent,
  DamageEvent,
  DeathEvent,
  MatchTraceEvent,
  Unit,
  Position,
} from '../../../src/systems/matchTrace/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createPosition = (x = 0, y = 0, z = 0): Position => ({ x, y, z });

const createSpawnEvent = (
  entityId = 'robot-1',
  teamId = 'team-a',
  position = createPosition(0, 0, 0),
  timestampMs = 0,
): SpawnEvent => ({
  type: 'spawn',
  entityId,
  teamId,
  position,
  timestampMs,
});

const createMoveEvent = (
  entityId = 'robot-1',
  position = createPosition(1, 0, 0),
  timestampMs = 100,
): MoveEvent => ({
  type: 'move',
  entityId,
  position,
  timestampMs,
});

const createDamageEvent = (
  targetId = 'robot-1',
  attackerId = 'robot-2',
  amount = 10,
  resultingHealth = 90,
  timestampMs = 200,
): DamageEvent => ({
  type: 'damage',
  targetId,
  attackerId,
  amount,
  resultingHealth,
  timestampMs,
});

const createDeathEvent = (
  entityId = 'robot-1',
  killedBy = 'robot-2',
  timestampMs = 300,
): DeathEvent => ({
  type: 'death',
  entityId,
  killedBy,
  timestampMs,
});

const createUnit = (
  id = 'unit-1',
  teamId = 'team-a',
  maxHealth = 100,
  modelRef = 'model:robot-default',
): Unit => ({
  id,
  teamId,
  maxHealth,
  modelRef,
  currentHealth: maxHealth,
});

// ============================================================================
// Test Suites
// ============================================================================

describe('EntityMapper', () => {
  let mapper: EntityMapper;

  beforeEach(() => {
    mapper = new EntityMapper();
  });

  // ==========================================================================
  // Spawn Event Processing
  // ==========================================================================

  describe('Spawn Event Processing', () => {
    it('should create entity from spawn event', () => {
      const event = createSpawnEvent();
      const snapshot = mapper.updateFromEvents([event], 0, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity).toBeDefined();
      expect(entity?.id).toBe('robot-1');
      expect(entity?.teamId).toBe('team-a');
      expect(entity?.type).toBe('robot');
      expect(entity?.isAlive).toBe(true);
      expect(entity?.spawnedAt).toBe(0);
    });

    it('should set entity position from spawn event', () => {
      const position = createPosition(10, 20, 30);
      const event = createSpawnEvent('robot-1', 'team-a', position);
      mapper.updateFromEvents([event], 0, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(position);
    });

    it('should handle missing entityId in spawn event', () => {
      const event = createSpawnEvent();
      event.entityId = undefined as any;
      mapper.updateFromEvents([event], 0, 0);

      const entity = mapper.getEntity('unknown');
      expect(entity).toBeDefined();
      expect(entity?.id).toBe('unknown');
    });

    it('should handle multiple spawn events', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createSpawnEvent('robot-2', 'team-a', createPosition(5, 0, 0), 0),
        createSpawnEvent('robot-3', 'team-b', createPosition(10, 0, 0), 0),
      ];
      mapper.updateFromEvents(events, 0, 0);

      expect(mapper.getAllEntities().length).toBe(3);
      expect(mapper.getEntity('robot-1')).toBeDefined();
      expect(mapper.getEntity('robot-2')).toBeDefined();
      expect(mapper.getEntity('robot-3')).toBeDefined();
    });

    it('should preserve spawn time for later queries', () => {
      const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 500);
      mapper.updateFromEvents([event], 500, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.spawnedAt).toBe(500);
    });
  });

  // ==========================================================================
  // Move Event Processing
  // ==========================================================================

  describe('Move Event Processing', () => {
    it('should update entity position from move event', () => {
      const spawnEvent = createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0);
      const moveEvent = createMoveEvent('robot-1', createPosition(5, 10, 15), 100);

      mapper.updateFromEvents([spawnEvent, moveEvent], 100, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(createPosition(5, 10, 15));
    });

    it('should handle move events for non-existent entities gracefully', () => {
      const moveEvent = createMoveEvent('unknown-robot', createPosition(5, 0, 0), 100);
      mapper.updateFromEvents([moveEvent], 100, 0);

      // Should not throw, mapper should have no entities
      expect(mapper.getAllEntities().length).toBe(0);
    });

    it('should process multiple move events in sequence', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createMoveEvent('robot-1', createPosition(1, 0, 0), 50),
        createMoveEvent('robot-1', createPosition(2, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(3, 0, 0), 150),
      ];
      mapper.updateFromEvents(events, 150, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(createPosition(3, 0, 0));
    });

    it('should only process move events up to given timestamp', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createMoveEvent('robot-1', createPosition(1, 0, 0), 50),
        createMoveEvent('robot-1', createPosition(2, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(3, 0, 0), 150),
      ];
      mapper.updateFromEvents(events, 100, 0);

      const entity = mapper.getEntity('robot-1');
      // Should only have processed moves at 0, 50, 100
      expect(entity?.position).toEqual(createPosition(2, 0, 0));
    });
  });

  // ==========================================================================
  // Damage Event Processing
  // ==========================================================================

  describe('Damage Event Processing', () => {
    it('should update entity health from damage event', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDamageEvent('robot-1', 'robot-2', 10, 90, 100),
      ];
      mapper.updateFromEvents(events, 100, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.currentHealth).toBe(90);
    });

    it('should initialize maxHealth from first damage event', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDamageEvent('robot-1', 'robot-2', 10, 90, 100),
      ];
      mapper.updateFromEvents(events, 100, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.maxHealth).toBe(90); // First resulting health becomes maxHealth
    });

    it('should preserve existing maxHealth on subsequent damage', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDamageEvent('robot-1', 'robot-2', 10, 90, 100),
        createDamageEvent('robot-1', 'robot-2', 10, 80, 200),
      ];
      mapper.updateFromEvents(events, 200, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.maxHealth).toBe(90); // Not updated to 80
      expect(entity?.currentHealth).toBe(80); // Updated to new health
    });

    it('should handle damage to non-existent entities gracefully', () => {
      const damageEvent = createDamageEvent('unknown-robot', 'robot-2', 10, 90, 100);
      mapper.updateFromEvents([damageEvent], 100, 0);

      expect(mapper.getEntity('unknown-robot')).toBeUndefined();
    });

    it('should process multiple damage events to same entity', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDamageEvent('robot-1', 'robot-2', 10, 90, 100),
        createDamageEvent('robot-1', 'robot-3', 10, 80, 200),
        createDamageEvent('robot-1', 'robot-2', 10, 70, 300),
      ];
      mapper.updateFromEvents(events, 300, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.currentHealth).toBe(70);
    });
  });

  // ==========================================================================
  // Death Event Processing
  // ==========================================================================

  describe('Death Event Processing', () => {
    it('should mark entity as dead from death event', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDeathEvent('robot-1', 'robot-2', 300),
      ];
      mapper.updateFromEvents(events, 300, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.isAlive).toBe(false);
      expect(entity?.diedAt).toBe(300);
    });

    it('should set diedAt timestamp from death event', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createDeathEvent('robot-1', 'robot-2', 1234),
      ];
      mapper.updateFromEvents(events, 1234, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.diedAt).toBe(1234);
    });

    it('should handle death of non-existent entities gracefully', () => {
      const deathEvent = createDeathEvent('unknown-robot', 'killer', 300);
      mapper.updateFromEvents([deathEvent], 300, 0);

      expect(mapper.getEntity('unknown-robot')).toBeUndefined();
    });

    it('should preserve position and team after death', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(5, 10, 15), 0),
        createDeathEvent('robot-1', 'robot-2', 300),
      ];
      mapper.updateFromEvents(events, 300, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(createPosition(5, 10, 15));
      expect(entity?.teamId).toBe('team-a');
    });
  });

  // ==========================================================================
  // Snapshot Generation and Caching
  // ==========================================================================

  describe('Snapshot Generation', () => {
    it('should return EntitySnapshot with correct structure', () => {
      const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      const snapshot = mapper.updateFromEvents([event], 0, 0);

      expect(snapshot).toBeDefined();
      expect(snapshot.entities).toBeInstanceOf(Map);
      expect(snapshot.timestamp).toBe(0);
      expect(snapshot.frameIndex).toBe(0);
    });

    it('should include all current entities in snapshot', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createSpawnEvent('robot-2', 'team-b', createPosition(), 0),
        createSpawnEvent('robot-3', 'team-a', createPosition(), 0),
      ];
      const snapshot = mapper.updateFromEvents(events, 0, 0);

      expect(snapshot.entities.size).toBe(3);
      expect(snapshot.entities.has('robot-1')).toBe(true);
      expect(snapshot.entities.has('robot-2')).toBe(true);
      expect(snapshot.entities.has('robot-3')).toBe(true);
    });

    it('should cache snapshot for retrieval', () => {
      const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      mapper.updateFromEvents([event], 0, 0);

      const cachedSnapshot = mapper.getLastSnapshot();
      expect(cachedSnapshot).toBeDefined();
      expect(cachedSnapshot?.timestamp).toBe(0);
    });

    it('should set frameIndex correctly in snapshot', () => {
      const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      mapper.updateFromEvents([event], 0, 42);

      const snapshot = mapper.getLastSnapshot();
      expect(snapshot?.frameIndex).toBe(42);
    });

    it('should update cached snapshot on new updateFromEvents call', () => {
      const spawn = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      mapper.updateFromEvents([spawn], 0, 0);

      const snapshot1 = mapper.getLastSnapshot();
      expect(snapshot1?.timestamp).toBe(0);

      const move = createMoveEvent('robot-1', createPosition(1, 0, 0), 100);
      mapper.updateFromEvents([spawn, move], 100, 1);

      const snapshot2 = mapper.getLastSnapshot();
      expect(snapshot2?.timestamp).toBe(100);
      expect(snapshot2?.frameIndex).toBe(1);
    });
  });

  // ==========================================================================
  // Entity Queries
  // ==========================================================================

  describe('Entity Queries', () => {
    beforeEach(() => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createSpawnEvent('robot-2', 'team-a', createPosition(), 0),
        createSpawnEvent('robot-3', 'team-b', createPosition(), 0),
        createDeathEvent('robot-2', 'robot-1', 100),
      ];
      mapper.updateFromEvents(events, 100, 0);
    });

    it('should get single entity by ID', () => {
      const entity = mapper.getEntity('robot-1');
      expect(entity?.id).toBe('robot-1');
      expect(entity?.teamId).toBe('team-a');
    });

    it('should return undefined for missing entity', () => {
      const entity = mapper.getEntity('nonexistent');
      expect(entity).toBeUndefined();
    });

    it('should get all entities', () => {
      const entities = mapper.getAllEntities();
      expect(entities.length).toBe(3);
      expect(entities.map((e) => e.id)).toEqual(
        expect.arrayContaining(['robot-1', 'robot-2', 'robot-3']),
      );
    });

    it('should filter for alive entities only', () => {
      const alive = mapper.getAliveEntities();
      expect(alive.length).toBe(2);
      expect(alive.every((e) => e.isAlive)).toBe(true);
      expect(alive.map((e) => e.id)).toEqual(expect.arrayContaining(['robot-1', 'robot-3']));
    });

    it('should get entities by team ID', () => {
      const teamA = mapper.getEntitiesByTeam('team-a');
      expect(teamA.length).toBe(2);
      expect(teamA.every((e) => e.teamId === 'team-a')).toBe(true);

      const teamB = mapper.getEntitiesByTeam('team-b');
      expect(teamB.length).toBe(1);
      expect(teamB[0].id).toBe('robot-3');
    });

    it('should return empty array for non-existent team', () => {
      const teamC = mapper.getEntitiesByTeam('team-c');
      expect(teamC).toEqual([]);
    });
  });

  // ==========================================================================
  // Reset and Cleanup
  // ==========================================================================

  describe('Reset and Cleanup', () => {
    it('should clear all entities on reset', () => {
      const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      mapper.updateFromEvents([event], 0, 0);
      expect(mapper.getAllEntities().length).toBe(1);

      mapper.reset();
      expect(mapper.getAllEntities().length).toBe(0);
    });

    it('should clear snapshot on reset', () => {
      const event = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      mapper.updateFromEvents([event], 0, 0);
      expect(mapper.getLastSnapshot()).toBeDefined();

      mapper.reset();
      expect(mapper.getLastSnapshot()).toBeNull();
    });

    it('should allow rebuilding after reset', () => {
      const event1 = createSpawnEvent('robot-1', 'team-a', createPosition(), 0);
      mapper.updateFromEvents([event1], 0, 0);
      mapper.reset();

      const event2 = createSpawnEvent('robot-2', 'team-b', createPosition(), 0);
      mapper.updateFromEvents([event2], 0, 0);

      expect(mapper.getAllEntities().length).toBe(1);
      expect(mapper.getEntity('robot-2')).toBeDefined();
      expect(mapper.getEntity('robot-1')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Debug Information
  // ==========================================================================

  describe('Debug Information', () => {
    it('should generate debug string with entity counts', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(), 0),
        createSpawnEvent('robot-2', 'team-a', createPosition(), 0),
        createDeathEvent('robot-1', 'robot-2', 100),
      ];
      mapper.updateFromEvents(events, 100, 0);

      const debug = mapper.getDebugInfo();
      expect(debug).toContain('Alive: 1');
      expect(debug).toContain('Dead: 1');
      expect(debug).toContain('Total: 2');
    });

    it('should handle empty mapper in debug info', () => {
      const debug = mapper.getDebugInfo();
      expect(debug).toContain('Alive: 0');
      expect(debug).toContain('Dead: 0');
      expect(debug).toContain('Total: 0');
    });
  });

  // ==========================================================================
  // Event Ordering and Timestamp Filtering
  // ==========================================================================

  describe('Event Ordering and Timestamp Filtering', () => {
    it('should only process events up to given timestamp', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createMoveEvent('robot-1', createPosition(1, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(2, 0, 0), 200),
        createMoveEvent('robot-1', createPosition(3, 0, 0), 300),
      ];

      mapper.updateFromEvents(events, 150, 0);

      const entity = mapper.getEntity('robot-1');
      expect(entity?.position).toEqual(createPosition(1, 0, 0));
    });

    it('should respect timestamp filtering even when events are passed in order', () => {
      // Events in chronological order
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createMoveEvent('robot-1', createPosition(1, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(2, 0, 0), 200),
        createMoveEvent('robot-1', createPosition(3, 0, 0), 300),
      ];

      mapper.updateFromEvents(events, 150, 0);

      const entity = mapper.getEntity('robot-1');
      // Only events up to 150ms should be processed, so position should be from 100ms move
      expect(entity?.position).toEqual(createPosition(1, 0, 0));
    });

    it('should stop processing at timestamp boundary', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createMoveEvent('robot-1', createPosition(1, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(2, 0, 0), 100), // Same timestamp
        createMoveEvent('robot-1', createPosition(3, 0, 0), 200),
      ];

      mapper.updateFromEvents(events, 100, 0);

      const entity = mapper.getEntity('robot-1');
      // Should process both events at 100
      expect(entity?.position.x).toBeLessThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  describe('Helper: entityStateFromUnit', () => {
    it('should create EntityState from Unit', () => {
      const unit = createUnit('unit-1', 'team-a', 100, 'model:robot-v1');
      const position = createPosition(5, 10, 15);

      const state = entityStateFromUnit(unit, 1000, position);

      expect(state.id).toBe('unit-1');
      expect(state.teamId).toBe('team-a');
      expect(state.type).toBe('robot');
      expect(state.spawnedAt).toBe(1000);
      expect(state.isAlive).toBe(true);
      expect(state.position).toEqual(position);
      expect(state.currentHealth).toBe(100);
      expect(state.maxHealth).toBe(100);
      expect(state.modelRef).toBe('model:robot-v1');
    });

    it('should handle different unit health values', () => {
      const unit = createUnit('unit-2', 'team-b', 250, 'model:robot-heavy');
      const state = entityStateFromUnit(unit, 500, createPosition());

      expect(state.maxHealth).toBe(250);
      expect(state.currentHealth).toBe(250);
    });
  });

  describe('Helper: filterVisibleEntities', () => {
    it('should filter out dead entities', () => {
      const entities: EntityState[] = [
        {
          id: 'robot-1',
          teamId: 'team-a',
          type: 'robot',
          spawnedAt: 0,
          isAlive: true,
          position: createPosition(),
        },
        {
          id: 'robot-2',
          teamId: 'team-a',
          type: 'robot',
          spawnedAt: 0,
          isAlive: false,
          diedAt: 100,
          position: createPosition(),
        },
        {
          id: 'robot-3',
          teamId: 'team-b',
          type: 'robot',
          spawnedAt: 0,
          isAlive: true,
          position: createPosition(),
        },
      ];

      const visible = filterVisibleEntities(entities);

      expect(visible.length).toBe(2);
      expect(visible.every((e) => e.isAlive)).toBe(true);
      expect(visible.map((e) => e.id)).toEqual(
        expect.arrayContaining(['robot-1', 'robot-3']),
      );
    });

    it('should return empty array for all dead entities', () => {
      const entities: EntityState[] = [
        {
          id: 'robot-1',
          teamId: 'team-a',
          type: 'robot',
          spawnedAt: 0,
          isAlive: false,
          diedAt: 100,
          position: createPosition(),
        },
      ];

      const visible = filterVisibleEntities(entities);

      expect(visible.length).toBe(0);
    });

    it('should return all entities when all alive', () => {
      const entities: EntityState[] = [
        {
          id: 'robot-1',
          teamId: 'team-a',
          type: 'robot',
          spawnedAt: 0,
          isAlive: true,
          position: createPosition(),
        },
        {
          id: 'robot-2',
          teamId: 'team-a',
          type: 'robot',
          spawnedAt: 0,
          isAlive: true,
          position: createPosition(),
        },
      ];

      const visible = filterVisibleEntities(entities);

      expect(visible.length).toBe(2);
    });
  });

  // ==========================================================================
  // Complex Integration Scenarios
  // ==========================================================================

  describe('Complex Integration Scenarios', () => {
    it('should handle full match lifecycle with all event types', () => {
      const events: MatchTraceEvent[] = [
        // Initial spawns (t=0)
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createSpawnEvent('robot-2', 'team-a', createPosition(1, 0, 0), 0),
        createSpawnEvent('robot-3', 'team-b', createPosition(10, 0, 0), 0),
        // Movement phase (t=100-200)
        createMoveEvent('robot-1', createPosition(2, 0, 0), 100),
        createMoveEvent('robot-3', createPosition(8, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(4, 0, 0), 150),
        // Combat phase (t=300-400)
        createDamageEvent('robot-3', 'robot-1', 30, 70, 300),
        createDamageEvent('robot-3', 'robot-1', 40, 30, 350),
        createDeathEvent('robot-3', 'robot-1', 400),
      ];

      mapper.updateFromEvents(events, 400, 0);

      // Verify final state
      expect(mapper.getAllEntities().length).toBe(3);
      expect(mapper.getAliveEntities().length).toBe(2);
      expect(mapper.getEntitiesByTeam('team-a').length).toBe(2);
      expect(mapper.getEntitiesByTeam('team-b').length).toBe(1);

      const robot3 = mapper.getEntity('robot-3');
      expect(robot3?.isAlive).toBe(false);
      expect(robot3?.diedAt).toBe(400);
      expect(robot3?.position).toEqual(createPosition(8, 0, 0));
    });

    it('should support incremental snapshot generation', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-1', 'team-a', createPosition(0, 0, 0), 0),
        createMoveEvent('robot-1', createPosition(1, 0, 0), 100),
        createMoveEvent('robot-1', createPosition(2, 0, 0), 200),
      ];

      // Generate snapshots at different timestamps
      const snap1 = mapper.updateFromEvents(events, 0, 0);
      expect(snap1.entities.get('robot-1')?.position).toEqual(createPosition(0, 0, 0));

      const snap2 = mapper.updateFromEvents(events, 100, 1);
      expect(snap2.entities.get('robot-1')?.position).toEqual(createPosition(1, 0, 0));

      const snap3 = mapper.updateFromEvents(events, 200, 2);
      expect(snap3.entities.get('robot-1')?.position).toEqual(createPosition(2, 0, 0));
    });

    it('should maintain consistency across multiple teams', () => {
      const events: MatchTraceEvent[] = [
        createSpawnEvent('robot-a1', 'team-a', createPosition(0, 0, 0), 0),
        createSpawnEvent('robot-a2', 'team-a', createPosition(1, 0, 0), 0),
        createSpawnEvent('robot-b1', 'team-b', createPosition(10, 0, 0), 0),
        createSpawnEvent('robot-b2', 'team-b', createPosition(11, 0, 0), 0),
        createDamageEvent('robot-b1', 'robot-a1', 20, 80, 100),
        createDamageEvent('robot-a2', 'robot-b2', 15, 85, 150),
      ];

      mapper.updateFromEvents(events, 150, 0);

      const teamA = mapper.getEntitiesByTeam('team-a');
      const teamB = mapper.getEntitiesByTeam('team-b');

      expect(teamA.length).toBe(2);
      expect(teamB.length).toBe(2);

      // Verify health tracking per team
      expect(teamA.find((e) => e.id === 'robot-a2')?.currentHealth).toBe(85);
      expect(teamB.find((e) => e.id === 'robot-b1')?.currentHealth).toBe(80);
    });
  });
});
