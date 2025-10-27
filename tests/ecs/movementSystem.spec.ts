import { describe, expect, it } from 'vitest';

import { updateMovementSystem } from '../../src/ecs/systems/movementSystem';
import { createBattleWorld, RobotEntity, toVec3 } from '../../src/ecs/world';

function createRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const base: RobotEntity = {
    id: 'robot',
    kind: 'robot',
    team: 'red',
    position: toVec3(-12, 0, 0),
    velocity: toVec3(0, 0, 0),
    orientation: 0,
    weapon: 'laser',
    fireCooldown: 0,
    fireRate: 1,
    health: 100,
    maxHealth: 100,
    ai: {
      mode: 'seek',
      targetId: undefined,
      anchorPosition: toVec3(-12, 0, 0),
      strafeSign: 1,
    },
    kills: 0,
    isCaptain: false,
    spawnIndex: 0,
    lastDamageTimestamp: 0,
  };

  return {
    ...base,
    ...overrides,
    position: overrides.position ?? { ...base.position },
    velocity: overrides.velocity ?? { ...base.velocity },
    ai: { ...base.ai, ...overrides.ai },
  };
}

describe('updateMovementSystem', () => {
  it('leaves robot position to be resolved by physics', () => {
    const world = createBattleWorld();
    const robot = createRobot();

    world.world.add(robot);
    const before = { ...robot.position };

    updateMovementSystem(world, 0.016);

    expect(robot.position).toEqual(before);
  });
});
