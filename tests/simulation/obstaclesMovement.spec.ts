import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { vec3 } from '../../src/lib/math/vec3';

describe('updateObstacleMovement', () => {
  it('moves a barrier linearly between two points at the given speed', () => {
    const world = createBattleWorld();

    const obstacle = {
      id: 'lin-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(-5, 0, 0),
      blocksMovement: true,
      blocksVision: true,
      movementPattern: {
        patternType: 'linear' as const,
        points: [vec3(-5, 0, 0), vec3(5, 0, 0)],
        speed: 1, // units per second
        loop: false,
        pingPong: false,
      },
    };

    world.world.add(obstacle);

    // step 1 second: should move +1 unit along X from -5 to 5 -> -4
    updateObstacleMovement(world, 1000);
    expect(obstacle.position.x).toBeCloseTo(-4, 2);

    // step 5 seconds: total move 6 units => position -5 + 6 = 1
    updateObstacleMovement(world, 5000);
    expect(obstacle.position.x).toBeCloseTo(1, 2);
  });
});
