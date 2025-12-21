import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';

describe('Obstacle entity integration', () => {
  it('adds and indexes obstacle entities in the world store', () => {
    const world = createBattleWorld();

    const obstacle = {
      id: 'obstacle-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: { x: 0, y: 0, z: 0 },
      blocksVision: true,
      blocksMovement: true,
      active: true,
    };

    world.world.add(obstacle);

    const stored = world.obstacles.entities;
    expect(stored.length).toBeGreaterThanOrEqual(1);
    expect(stored.some((e) => e.id === obstacle.id)).toBe(true);
  });
});
