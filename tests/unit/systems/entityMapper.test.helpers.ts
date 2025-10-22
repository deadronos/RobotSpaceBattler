import type { Position, SpawnEvent, MoveEvent, DamageEvent, DeathEvent, Unit } from '../../../src/systems/matchTrace/types';

export const createPosition = (x = 0, y = 0, z = 0): Position => ({ x, y, z });

export const createSpawnEvent = (
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

export const createMoveEvent = (
  entityId = 'robot-1',
  position = createPosition(1, 0, 0),
  timestampMs = 100,
): MoveEvent => ({
  type: 'move',
  entityId,
  position,
  timestampMs,
});

export const createDamageEvent = (
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

export const createDeathEvent = (
  entityId = 'robot-1',
  killedBy = 'robot-2',
  timestampMs = 300,
): DeathEvent => ({
  type: 'death',
  entityId,
  killedBy,
  timestampMs,
});

export const createUnit = (
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
