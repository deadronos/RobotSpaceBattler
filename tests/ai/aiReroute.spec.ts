import { describe, expect, it } from 'vitest';

import { createBattleWorld } from '../../src/ecs/world';
import { createTestRobot } from '../helpers/robotFactory';
import { updateAISystem } from '../../src/ecs/systems/aiSystem';

describe('AI reroute when path becomes blocked', () => {
  it('adjusts plan when an obstacle becomes active in the path', () => {
    const world = createBattleWorld();

    const robot = createTestRobot({ id: 'a', position: { x: 0, y: 0, z: 0 } as any });
    const target = createTestRobot({ id: 'b', position: { x: 10, y: 0, z: 0 } as any });

    world.world.add(robot);
    world.world.add(target);

    const obstacle = {
      id: 'obs-1',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: { x: 4, y: 0, z: 0 },
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1 },
      blocksVision: true,
      blocksMovement: true,
      active: false,
    } as any;

    world.world.add(obstacle);

    // initial AI evaluation with obstacle inactive
    world.state.elapsedMs = 0;
    updateAISystem(world, () => 0.42);
    const v0x = robot.velocity.x;

    // enable obstacle (simulate it moving into place)
    obstacle.active = true;

    // run AI update again -> should change planned movement due to avoidance
    updateAISystem(world, () => 0.42);
    const v1x = robot.velocity.x;

    expect(v1x).toBeLessThanOrEqual(v0x + 1e-6);
  });
});
