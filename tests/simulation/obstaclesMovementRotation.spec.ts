import { describe, it, expect } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { updateObstacleMovement } from '../../src/simulation/obstacles/movementSystem';
import { vec3 } from '../../src/lib/math/vec3';

describe('updateObstacleMovement - rotation', () => {
  it('rotates a barrier around a pivot by the configured radians/sec', () => {
    const world = createBattleWorld();

    const obstacle = {
      id: 'rot-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(2, 0, 0),
      blocksMovement: true,
      blocksVision: true,
      movementPattern: {
        patternType: 'rotation' as const,
        pivot: vec3(0, 0, 0),
        speed: Math.PI, // radians per second (180deg/s)
        phase: 0,
        loop: true,
      },
    };

    world.world.add(obstacle);

    // step 1 second => rotate 180 degrees => (2,0,0) -> (-2,0,0)
    updateObstacleMovement(world, 1000);
    expect(obstacle.position.x).toBeCloseTo(-2, 2);

    // step another second => rotate another 180deg back to (2,0,0)
    updateObstacleMovement(world, 1000);
    expect(obstacle.position.x).toBeCloseTo(2, 2);
  });
});
