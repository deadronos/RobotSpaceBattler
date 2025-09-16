import { beforeEach, expect, test } from 'vitest';

import { resetWorld, world } from '../src/ecs/miniplexStore';
import { spawnRobot } from '../src/robots/spawnControls';
import { respawnSystem, clearRespawnQueue } from '../src/systems/RespawnSystem';
import { scoringSystem, getScores, resetScores } from '../src/systems/ScoringSystem';
import type { DeathEvent } from '../src/systems/DamageSystem';

type TeamEntity = {
  team?: 'red' | 'blue';
  projectile?: unknown;
  weapon?: { type: string };
  id?: number | string;
};

function countTeam(team: 'red' | 'blue') {
  return Array.from(world.entities).filter((entity) => {
    const e = entity as TeamEntity;
    return e.team === team && !e.projectile;
  }).length;
}

beforeEach(() => {
  resetWorld();
  resetScores();
  clearRespawnQueue();
});

test('scoringSystem increments killer team score for enemy deaths', () => {
  const events: DeathEvent[] = [
    {
      entityId: 42,
      position: [0, 0, 0],
      team: 'blue',
      killerId: 1,
      killerTeam: 'red',
    },
  ];

  scoringSystem(events);
  const scores = getScores();
  expect(scores.red).toBe(1);
  expect(scores.blue).toBe(0);
});

test('scoringSystem ignores friendly fire and unknown killer data', () => {
  const events: DeathEvent[] = [
    {
      entityId: 1,
      position: [0, 0, 0],
      team: 'red',
      killerId: 99,
      killerTeam: 'red',
    },
    {
      entityId: 2,
      position: [0, 0, 0],
      team: 'blue',
    },
  ];

  scoringSystem(events);
  const scores = getScores();
  expect(scores.red).toBe(0);
  expect(scores.blue).toBe(0);
});

test('respawnSystem removes dead entity and respawns replacement with same loadout', () => {
  const robot = spawnRobot('red', 'rocket');
  const originalId = robot.id as number;
  const originalWeapon = robot.weapon?.type;

  const death: DeathEvent = {
    entityId: originalId,
    position: robot.position ?? [0, 0, 0],
    team: 'red',
  };

  expect(countTeam('red')).toBe(1);

  respawnSystem(world, [death], { respawnDelayMs: 1000, now: 0 });
  expect(countTeam('red')).toBe(0);

  // Still waiting for respawn
  respawnSystem(world, [], { respawnDelayMs: 1000, now: 500 });
  expect(countTeam('red')).toBe(0);

  // Time threshold reached
  respawnSystem(world, [], { respawnDelayMs: 1000, now: 1200 });
  expect(countTeam('red')).toBe(1);

  const replacement = Array.from(world.entities).find((entity) => {
    const e = entity as TeamEntity;
    return e.team === 'red' && !e.projectile;
  }) as TeamEntity | undefined;

  expect(replacement).toBeDefined();
  expect(replacement?.id).not.toBe(originalId);
  expect(replacement?.weapon?.type).toBe(originalWeapon);
});
