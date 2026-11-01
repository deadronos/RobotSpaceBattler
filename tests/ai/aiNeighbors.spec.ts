import { describe, expect, it } from "vitest";

import {
  buildNeighbors,
  NEIGHBOR_RADIUS,
} from "../../src/ecs/systems/aiNeighbors";
import { distanceVec3, Vec3 } from "../../src/lib/math/vec3";
import { SpatialGrid } from "../../src/simulation/ai/spatialGrid";
import type { RobotEntity } from "../../src/ecs/world";
import { createTestRobot } from "../helpers/robotFactory";

function robot(
  id: string,
  team: "red" | "blue",
  x: number,
  z: number,
): RobotEntity {
  return createTestRobot({ id, team, position: { x, y: 0, z } });
}

describe("buildNeighbors (#201)", () => {
  it("returns nearby allies in world order and skips self, enemies and far allies", () => {
    const a = robot("red-a", "red", 0, 0);
    const near1 = robot("red-b", "red", 1, 0);
    const near2 = robot("red-c", "red", 0, -1.5);
    const far = robot("red-d", "red", NEIGHBOR_RADIUS + 0.1, 0);
    const high = robot("red-e", "red", 0.5, 0);
    high.position.y = NEIGHBOR_RADIUS + 1; // out of 3D range only
    const enemy = robot("blue-a", "blue", 0.5, 0.5);

    const grid = new SpatialGrid(16);
    grid.rebuild([a, near1, near2, far, high, enemy]);

    const out: Vec3[] = [];
    const neighbors = buildNeighbors(a, grid, out);

    expect(neighbors).toBe(out);
    expect(neighbors.map((position) => `${position.x},${position.z}`)).toEqual([
      "1,0",
      "0,-1.5",
    ]);
    expect(neighbors).not.toContain(far.position);
  });

  it("reuses the output array and drops stale entries", () => {
    const a = robot("red-a", "red", 0, 0);
    const b = robot("red-b", "red", 1, 0);
    const grid = new SpatialGrid(16);
    grid.rebuild([a, b]);

    const out: Vec3[] = [];
    buildNeighbors(a, grid, out);
    expect(out.length).toBe(1);

    b.position.x = 20;
    grid.rebuild([a, b]);
    buildNeighbors(a, grid, out);
    expect(out.length).toBe(0);
  });

  it("only counts allies within the exact 3D neighbor radius", () => {
    const a = robot("red-a", "red", 0, 0);
    const inside = robot("red-b", "red", 0.6, 0.6);
    const outside = robot("red-c", "red", 2.4, 0.8);
    const grid = new SpatialGrid(16);
    grid.rebuild([a, inside, outside]);

    expect(distanceVec3(a.position, outside.position)).toBeGreaterThan(
      NEIGHBOR_RADIUS,
    );

    const neighbors = buildNeighbors(a, grid, []);
    expect(neighbors).toHaveLength(1);
    expect(neighbors[0]).toBe(inside.position);
  });
});
