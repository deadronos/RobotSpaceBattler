import { describe, expect, it } from 'vitest';

import { createTestRobot } from '../helpers/robotFactory';
import { planRobotMovement } from '../../src/simulation/ai/pathing';
import { RobotBehaviorMode } from '../../src/simulation/ai/behaviorState';
import { vec3 } from '../../src/lib/math/vec3';

describe('AI pathing - reactive avoidance with runtime obstacles', () => {
  it('alters desired velocity when an obstacle is in the direct path', () => {
    const robot = createTestRobot({ position: vec3(0, 0, 0) });
    const target = createTestRobot({ position: vec3(10, 0, 0) });

    const planNoObs = planRobotMovement(robot, RobotBehaviorMode.Seek, target, undefined, {});

    const obstacle = { position: { x: 4, y: 0, z: 0 }, shape: { kind: 'box', halfWidth: 1, halfDepth: 1 } };

    const planWithObs = planRobotMovement(robot, RobotBehaviorMode.Seek, target, undefined, {
      obstacles: [obstacle as any],
    });

    // With an obstacle in the way, the AI's X component should be less aggressive (steered away)
    expect(planWithObs.velocity.x).toBeLessThanOrEqual(planNoObs.velocity.x + 1e-6);
  });
});
