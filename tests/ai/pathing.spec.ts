import { describe, expect, it, vi, Mock } from 'vitest';

import { RobotBehaviorMode } from '../../src/simulation/ai/behaviorState';
import {
  integrateMovement,
  planRobotMovement,
} from '../../src/simulation/ai/pathing';
import { createTestRobot } from '../helpers/robotFactory';

/** Interface for our mock Rapier world with spyable castRayAndGetNormal */
interface MockRapierWorld {
  castRayAndGetNormal: Mock;
}

/** Helper to create a mock Rapier world that returns a predictable raycast result */
function createMockRapierWorld(hitDistance?: number): MockRapierWorld {
  return {
    castRayAndGetNormal: vi.fn().mockReturnValue(
      hitDistance !== undefined
        ? { timeOfImpact: hitDistance, normal: { x: 0, y: 0, z: -1 } }
        : null
    ),
  };
}

describe('planRobotMovement', () => {
  it('moves toward the target while seeking', () => {
    const robot = createTestRobot();
    const target = createTestRobot({
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
    const robot = createTestRobot({
      position: { x: -2, y: 0, z: 0 },
      velocity: { x: 1, y: 0, z: 0 },
    });
    const target = createTestRobot({
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
    const robot = createTestRobot({
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
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
    });
    const target = createTestRobot({
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

  it('shifts sideways when an ally blocks line of sight to the target', () => {
    const robot = createTestRobot({
      ai: { mode: 'engage', targetId: 'enemy', strafeSign: 1 },
    });
    const target = createTestRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: 0, y: 0, z: 8 },
    });

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Engage,
      target,
      undefined,
      {
        neighbors: [{ x: 0.25, y: 0, z: 3 }],
        strafeSign: 1,
      },
    );

    expect(Math.abs(plan.velocity.x)).toBeGreaterThan(0);
    expect(plan.velocity.z).toBeGreaterThanOrEqual(0);
  });
});



describe('planRobotMovement with predictive avoidance', () => {
  it('applies predictive avoidance when rapierWorld is provided and entity should raycast', () => {
    const robot = createTestRobot({
      id: 'robot-0', // entityId 0 should raycast on frame 0
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1 },
    });
    const target = createTestRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: 0, y: 0, z: 10 },
    });

    // Create a mock that hits on center ray at close distance
    const mockWorld = createMockRapierWorld(2.0);

    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      target,
      undefined,
      {
        // Cast to unknown to satisfy TypeScript - mock implements the required interface
        rapierWorld: mockWorld as unknown as NonNullable<Parameters<typeof planRobotMovement>[4]>['rapierWorld'],
        frameCount: 0, // entity 0 should raycast on frame 0
        entityId: 0,
      },
    );

    // castRayAndGetNormal should have been called (3 times for the fan pattern)
    expect(mockWorld.castRayAndGetNormal).toHaveBeenCalled();
    // The plan should have some velocity (combined from base movement and avoidance)
    expect(plan.velocity.z).toBeDefined();
  });

  it('skips predictive avoidance when rapierWorld is null (fallback to reactive-only)', () => {
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1 },
    });
    const target = createTestRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: 0, y: 0, z: 10 },
    });

    // Should work without error when rapierWorld is null
    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      target,
      undefined,
      {
        rapierWorld: null,
        frameCount: 0,
        entityId: 0,
      },
    );

    // Should still produce a valid movement plan (reactive avoidance only)
    expect(plan.velocity.z).toBeGreaterThan(0);
  });

  it('skips raycast when entity should not raycast this frame (uses cached result)', () => {
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 1 },
    });
    const target = createTestRobot({
      id: 'enemy',
      team: 'blue',
      position: { x: 0, y: 0, z: 10 },
    });

    const mockWorld = createMockRapierWorld(2.0);

    // Entity 0 should NOT raycast on frame 1 (0 % 3 !== 1 % 3)
    const plan = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      target,
      undefined,
      {
        // Cast to unknown to satisfy TypeScript - mock implements the required interface
        rapierWorld: mockWorld as unknown as NonNullable<Parameters<typeof planRobotMovement>[4]>['rapierWorld'],
        frameCount: 1,
        entityId: 0,
      },
    );

    // castRayAndGetNormal should NOT have been called (not this entity's frame)
    expect(mockWorld.castRayAndGetNormal).not.toHaveBeenCalled();
    // Should still produce a valid movement plan
    expect(plan.velocity.z).toBeGreaterThan(0);
  });

  it('blends predictive avoidance with reactive avoidance', () => {
    const robot = createTestRobot({
      position: { x: 0, y: 0, z: -48 }, // near wall at z = -50
      velocity: { x: 0, y: 0, z: -1 }, // moving toward wall
    });

    // No target - will move toward spawn center
    const mockWorld = createMockRapierWorld(2.0); // obstacle ahead

    const planWithPredictive = planRobotMovement(
      robot,
      RobotBehaviorMode.Seek,
      undefined,
      undefined,
      {
        // Cast to unknown to satisfy TypeScript - mock implements the required interface
        rapierWorld: mockWorld as unknown as NonNullable<Parameters<typeof planRobotMovement>[4]>['rapierWorld'],
        frameCount: 0,
        entityId: 0,
      },
    );

    // Both reactive (wall proximity) and predictive (raycast hit) should contribute
    // to pushing the robot away from the wall (positive z direction)
    expect(planWithPredictive.velocity.z).toBeGreaterThan(0);
  });
});
