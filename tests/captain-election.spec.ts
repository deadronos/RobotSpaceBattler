import { describe, expect, it } from "vitest";

import { toVec3 } from "../src/ecs/world";
import { applyCaptaincy, electCaptain } from "../src/lib/captainElection";
import { createTestRobot } from "./helpers/robotFactory";

describe("captain election", () => {
  it("selects the highest health robot", () => {
    const robots = [
      createTestRobot({ id: "a", health: 70 }),
      createTestRobot({ id: "b", health: 90 }),
      createTestRobot({ id: "c", health: 45 }),
    ];

    expect(electCaptain("red", robots)).toBe("b");
  });

  it("breaks ties using kills then spawn distance then id", () => {
    const robots = [
      createTestRobot({
        id: "alpha",
        health: 100,
        kills: 1,
        position: toVec3(-10, 0, 0),
      }),
      createTestRobot({
        id: "beta",
        health: 100,
        kills: 3,
        position: toVec3(-10, 0, 0),
      }),
      createTestRobot({
        id: "gamma",
        health: 100,
        kills: 3,
        position: toVec3(-8, 0, 0),
      }),
      createTestRobot({
        id: "delta",
        health: 100,
        kills: 3,
        position: toVec3(-8, 0, 0),
      }),
    ];

    expect(electCaptain("red", robots)).toBe("beta");

    robots[1].kills = 1;
    expect(electCaptain("red", robots)).toBe("delta");

    robots[2].position = toVec3(-11, 0, 0);
    robots[3].position = toVec3(-8, 0, 0);
    expect(electCaptain("red", robots)).toBe("gamma");
  });

  it("updates captain flags in place", () => {
    const robots = [
      createTestRobot({ id: "r1", health: 100 }),
      createTestRobot({ id: "r2", health: 50 }),
    ];

    applyCaptaincy("red", robots);
    expect(robots[0].isCaptain).toBe(true);
    expect(robots[1].isCaptain).toBe(false);

    robots[0].health = 0;
    applyCaptaincy("red", robots);
    expect(robots[0].isCaptain).toBe(false);
    expect(robots[1].isCaptain).toBe(true);
  });
});
