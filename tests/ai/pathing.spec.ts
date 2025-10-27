import { describe, expect, it } from 'vitest';
import { RobotBehaviorMode } from '../../src/simulation/ai/behaviorState';
import {
  integrateMovement,
  planRobotMovement,
} from '../../src/simulation/ai/pathing';
import { RobotEntity } from '../../src/ecs/world';

function createRobot(overrides: Partial<RobotEntity> = {}): RobotEntity {
  const base: RobotEntity = {
    id: 'robot',
    kind: 'robot',
    team: 'red',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: 0,
    weapon: 'laser',
    fireCooldown: 0,
    fireRate: 1,
    health: 100,
    maxHealth: 100,
    ai: { mode: 'seek', targetId: undefined, strafeSign: 1 },
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
    ai: overrides.ai ?? { ...base.ai },
  };
}

describe('planRobotMovement', () => {
  it('moves toward the target while seeking', () => {
    const robot = createRobot();
    const target = createRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: 0, y: 0, z: 10 },
    });

    const plan = planRobotMovement(robot, RobotBehaviorMode.Seek, target);
    expect(plan.velocity.z).toBeCloseTo(6, 5);
    expect(plan.velocity.x).toBeCloseTo(0, 5);
    expect(plan.orientation).toBeCloseTo(0, 5);
  });

  it('retreats toward spawn and integrates velocity', () => {
    const robot = createRobot({
      position: { x: -2, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
    });
    const target = createRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: -4, y: 0, z: 0 },
    });

    const plan = planRobotMovement(robot, RobotBehaviorMode.Retreat, target);
    expect(plan.velocity.x).toBeLessThan(0);
    expect(plan.orientation).toBeLessThan(0);

    const nextPosition = integrateMovement(robot.position, plan.velocity, 0.5);
    expect(nextPosition.x).toBeLessThan(robot.position.x);
  });

  it('pushes away from nearby allies when anchored', () => {
    const robot = createRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      undefined,
      undefined,
      {
        formationAnchor: { x: 0, y: 0, z: 0 },
        neighbors: [{ x: 0.5, y: 0, z: 0 }],
      },
    );

    expect(plan.velocity.x).toBeLessThan(0);
  });

  it('strafes around the target when settled near the anchor', () => {
    const robot = createRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    const target = createRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: 0, y: 0, z: 10 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      target,
      undefined,
      {
        formationAnchor: { x: 0, y: 0, z: 0 },
        strafeSign: 1,
      },
    );

    expect(plan.velocity.x).toBeGreaterThan(0);
    expect(plan.velocity.z).toBeGreaterThan(0);
  });
});
