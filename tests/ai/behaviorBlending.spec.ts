import { describe, expect, it } from "vitest";
import { vec3 } from "../../src/lib/math/vec3";
import { planRobotMovement } from "../../src/simulation/ai/pathing";
import { RobotBehaviorMode } from "../../src/simulation/ai/behaviorState";
import { createTestRobot } from "../helpers/robotFactory";

describe("Behavior Blending Integration", () => {
  it("blends combat desire and pathfinding desire when path is available", () => {
    const robot = createTestRobot({ position: vec3(0, 0, 0) });
    const target = createTestRobot({ position: vec3(20, 0, 0) }); // Far enough to trigger pathfinding guideline
    
    // Setup a valid path pointing North (0, 0, 10)
    robot.pathComponent = {
      requestedTarget: target.position,
      status: "valid",
      path: {
        waypoints: [vec3(0, 0, 0), vec3(0, 0, 10)],
        totalDistance: 10,
        smoothed: true
      },
      currentWaypointIndex: 1,
      lastCalculationTime: Date.now()
    };

    const plan = planRobotMovement(robot, RobotBehaviorMode.Seek, target, undefined, {});
    
    // Combat desire points East (1, 0, 0)
    // Pathfinding desire points North (0, 0, 1)
    // Blended result should have both X and Z components
    expect(plan.velocity.x).toBeGreaterThan(0);
    expect(plan.velocity.z).toBeGreaterThan(0);
  });

  it("prioritizes retreat over pathfinding", () => {
    const robot = createTestRobot({ position: vec3(0, 0, 0) });
    const spawnCenter = vec3(-40, 0, 0); // West
    
    // Setup a valid path pointing North
    robot.pathComponent = {
      requestedTarget: vec3(0, 0, 20),
      status: "valid",
      path: {
        waypoints: [vec3(0, 0, 0), vec3(0, 0, 10)],
        totalDistance: 10,
        smoothed: true
      },
      currentWaypointIndex: 1,
      lastCalculationTime: Date.now()
    };

    const plan = planRobotMovement(robot, RobotBehaviorMode.Retreat, undefined, spawnCenter, {});
    
    // Retreat priority (2.0) is higher than pathfinding (1.0)
    // Spawn center is West (-1, 0, 0), Path is North (0, 0, 1)
    // Result should be heavily biased towards West
    expect(plan.velocity.x).toBeLessThan(0);
    expect(Math.abs(plan.velocity.x)).toBeGreaterThan(Math.abs(plan.velocity.z));
  });
});
