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
  measureAllocationsPerTick,
} from "../helpers/aiScenario";

/**
 * Guards the "no per-tick allocations in AI/combat hot paths" goal of #171.
 * heapUsed deltas are noisy, so thresholds sit far above the measured
 * steady-state values and far below the pre-change values.
 */
describe("AI hot path allocations", () => {
  it("targeting + neighbour queries are allocation free in steady state", () => {
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
        const near = grid.query(
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
          near,
          world,
          rng,
          grid.teamMembers(robot.team),
        );
        buildNeighbors(robot, grid, neighbors);
      }
    };

    const allocated = bytesPerTick(tick, 100, 30, 10);
    // Pre-change this path allocated several MB per tick at 100 robots.
    expect(allocated).toBeLessThan(48 * 1024);
  });

  it("full AI tick at 100 robots stays well below the pre-change baseline", () => {
    const { aiBytes } = measureAllocationsPerTick(100, 20);
    // Baseline before #171 was ~2.8 MB per tick.
    expect(aiBytes).toBeLessThan(512 * 1024);
  });
});
