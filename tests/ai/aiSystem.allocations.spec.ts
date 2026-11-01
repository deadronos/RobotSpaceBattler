// @vitest-environment node
import { describe, expect, it } from "vitest";

import { SpatialGrid } from "../../src/simulation/ai/spatialGrid";
import { updateTargeting } from "../../src/simulation/ai/decision";
import { buildNeighbors } from "../../src/ecs/systems/aiNeighbors";
import { SENSOR_RANGE } from "../../src/simulation/ai/sensors";
import type { RobotEntity } from "../../src/ecs/world";
import {
  buildScenarioWorld,
  bytesPerTick,
  createLcg,
} from "../helpers/aiScenario";

/**
 * Guards the "no per-tick allocations in AI/combat hot paths" goal of #171.
 * Allocation is measured with the V8 sampling heap profiler (statistical), so
 * thresholds sit above the measured steady-state values and far below the
 * pre-change values.
 */
describe("AI hot path allocations", () => {
  it("targeting + neighbour queries stay nearly allocation free in steady state", () => {
    const world = buildScenarioWorld(100);
    const robots = world.robots.entities;
    const grid = new SpatialGrid(SENSOR_RANGE / 2);
    const enemies: RobotEntity[] = [];
    const neighbors: { x: number; y: number; z: number }[] = [];
    const rng = createLcg(5);

    const tick = () => {
      grid.rebuild(robots);
      for (let i = 0; i < robots.length; i += 1) {
        const robot = robots[i];
        const enemyCount = grid.queryInto(
          robot.position.x,
          robot.position.z,
          SENSOR_RANGE,
          robot.team,
          false,
          robot,
          enemies,
        );
        updateTargeting(
          robot,
          robots,
          enemies,
          world,
          rng,
          grid.teamMembers(robot.team),
          enemyCount,
        );
        buildNeighbors(robot, grid, neighbors);
      }
    };

    const allocated = bytesPerTick(tick, 150, 200);
    // Measured ~26 KB per tick at 100 robots (#201: boxed doubles at call
    // boundaries are what is left), with a wide margin for v8 coverage
    // instrumentation; the pre-#201 implementation was several times higher.
    expect(allocated).toBeLessThan(160 * 1024);
  }, 30000);
});
