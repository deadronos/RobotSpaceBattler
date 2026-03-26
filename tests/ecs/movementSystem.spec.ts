import { describe, expect, it } from 'vitest';

import { updateMovementSystem } from '../../src/ecs/systems/movementSystem';
import { createBattleWorld } from '../../src/ecs/world';
import { vec3 } from '../../src/lib/math/vec3';
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

  it('does not displace robots when blocked by an active dynamic obstacle', () => {
    const world = createBattleWorld();
    const robot = createTestRobot();

    robot.position = vec3(0, 0, 0);
    robot.velocity = vec3(10, 0, 0);

    world.world.add(robot);
    world.world.add({
      id: 'blocker',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(100, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1, center: { x: 3, z: 0 } },
      blocksMovement: true,
      blocksVision: true,
      active: true,
    } as any);

    updateMovementSystem(world, 1);

    expect(robot.position.x).toBeCloseTo(0, 5);
    expect(robot.position.z).toBeCloseTo(0, 5);
  });

  it('ignores inactive dynamic obstacles when resolving movement', () => {
    const world = createBattleWorld();
    const robot = createTestRobot();

    robot.position = vec3(0, 0, 0);
    robot.velocity = vec3(10, 0, 0);

    world.world.add(robot);
    world.world.add({
      id: 'inactive-blocker',
      kind: 'obstacle' as const,
      obstacleType: 'barrier' as const,
      position: vec3(100, 0, 0),
      shape: { kind: 'box', halfWidth: 1, halfDepth: 1, center: { x: 3, z: 0 } },
      blocksMovement: true,
      blocksVision: true,
      active: false,
    } as any);

    updateMovementSystem(world, 1);

    expect(robot.position.x).toBeCloseTo(10, 5);
    expect(robot.position.z).toBeCloseTo(0, 5);
  });
});
