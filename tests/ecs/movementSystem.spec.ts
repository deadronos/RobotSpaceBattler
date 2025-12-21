import { describe, expect, it } from 'vitest';

import { updateMovementSystem } from '../../src/ecs/systems/movementSystem';
import { createBattleWorld } from '../../src/ecs/world';
import { createTestRobot } from '../helpers/robotFactory';

describe('updateMovementSystem', () => {
  it('leaves robot position to be resolved by physics', () => {
    const world = createBattleWorld();
    const robot = createTestRobot();

    world.world.add(robot);
    const before = { ...robot.position };

    updateMovementSystem(world, 0.016);

    expect(robot.position).toEqual(before);
  });
});
