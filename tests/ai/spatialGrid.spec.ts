// @vitest-environment node
import { describe, expect, it } from "vitest";

import { RobotEntity, toVec3 } from "../../src/ecs/world";
import { SpatialGrid } from "../../src/simulation/ai/spatialGrid";
import { createLcg } from "../helpers/aiScenario";
import { createTestRobot } from "../helpers/robotFactory";

function randomRobots(
  count: number,
  seed: number,
  spread = 100,
): RobotEntity[] {
  const rand = createLcg(seed);
  return Array.from({ length: count }, (_, i) =>
    createTestRobot({
      id: `r-${i}`,
      team: i % 2 === 0 ? "red" : "blue",
      position: toVec3(
        (rand() - 0.5) * spread,
        rand() * 3,
        (rand() - 0.5) * spread,
      ),
      health: rand() < 0.15 ? 0 : 100,
    }),
  );
}

function bruteForce(
  robots: RobotEntity[],
  seeker: RobotEntity,
  radius: number,
  team: string,
  sameTeam: boolean,
): RobotEntity[] {
  return robots.filter((r) => {
    if (r.health <= 0 || r.id === seeker.id) return false;
    if ((r.team === team) !== sameTeam) return false;
    const dx = r.position.x - seeker.position.x;
    const dz = r.position.z - seeker.position.z;
    return dx * dx + dz * dz <= radius * radius;
  });
}

describe("SpatialGrid", () => {
  it("matches brute force, in world order, for varied radii and sizes", () => {
    const grid = new SpatialGrid(20);
    const out: RobotEntity[] = [];
    for (const count of [0, 1, 20, 100, 200]) {
      const robots = randomRobots(count, 100 + count);
      grid.rebuild(robots);
      for (const radius of [2.5, 8, 38, 500]) {
        for (const seeker of robots) {
          for (const sameTeam of [false, true]) {
            grid.query(
              seeker.position.x,
              seeker.position.z,
              radius,
              seeker.team,
              sameTeam,
              seeker,
              out,
            );
            expect(out.map((r) => r.id)).toEqual(
              bruteForce(robots, seeker, radius, seeker.team, sameTeam).map(
                (r) => r.id,
              ),
            );
          }
        }
      }
    }
  });

  it("excludes dead robots and lists active team members in world order", () => {
    const robots = randomRobots(30, 5);
    const grid = new SpatialGrid();
    grid.rebuild(robots);
    expect(grid.teamMembers("red").map((r) => r.id)).toEqual(
      robots.filter((r) => r.team === "red" && r.health > 0).map((r) => r.id),
    );
  });

  it("handles robots outside the initial bounds and rebuilds cleanly", () => {
    const grid = new SpatialGrid(10);
    const out: RobotEntity[] = [];
    const a = createTestRobot({ id: "a", team: "red" });
    const b = createTestRobot({
      id: "b",
      team: "blue",
      position: toVec3(1000, 0, -1000),
    });
    grid.rebuild([a, b]);
    grid.query(0, 0, 5000, "red", false, a, out);
    expect(out.map((r) => r.id)).toEqual(["b"]);
    grid.query(0, 0, 5, "red", false, a, out);
    expect(out).toEqual([]);
    // Rebuild with different contents reuses the structure.
    grid.rebuild([a]);
    grid.query(0, 0, 5000, "red", false, a, out);
    expect(out).toEqual([]);
  });
});
