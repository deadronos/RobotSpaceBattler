import { describe, it, expect } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { vec3 } from '../../src/lib/math/vec3';

describe('updateObstacleMovement - oscillate', () => {
  it('moves a barrier back and forth when patternType is oscillate (ping-pong)', () => {
    const world = createBattleWorld();

    const obstacle = {
      id: 'osc-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(-5, 0, 0),
      blocksMovement: true,
      blocksVision: true,
      movementPattern: {
        patternType: 'oscillate' as const,
        points: [vec3(-5, 0, 0), vec3(5, 0, 0)],
        speed: 1, // units per second
        loop: false,
        pingPong: true,
      },
    };

    world.world.add(obstacle);

    // step 1s -> -4
    updateObstacleMovement(world, 1000);
    expect(obstacle.position.x).toBeCloseTo(-4, 2);

    // step 3s -> additional 3 units => position -1
    updateObstacleMovement(world, 3000);
    expect(obstacle.position.x).toBeCloseTo(-1, 2);
  });
});
