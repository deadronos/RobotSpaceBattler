import { Color } from "three";
import { describe, expect, it } from "vitest";

import { createTestRobot } from "../../helpers/robotFactory";
import {
  collectHealthBarRobots,
  healthBarColor,
  healthBarScale,
  healthFraction,
  isHealthBarVisible,
} from "../../../src/visuals/robots/healthBarLogic";
import {
  HEALTH_BAR_FULL_COLOR,
  HEALTH_BAR_LOW_COLOR,
  HEALTH_BAR_MID_COLOR,
} from "../../../src/visuals/robots/robotLayout";

describe("health bar mapping (#168)", () => {
  it("maps HP to a clamped fraction", () => {
    expect(healthFraction(100, 100)).toBe(1);
    expect(healthFraction(50, 100)).toBe(0.5);
    expect(healthFraction(0, 100)).toBe(0);
    expect(healthFraction(-20, 100)).toBe(0);
    expect(healthFraction(150, 100)).toBe(1);
  });

  it("treats a missing or zero max health as empty", () => {
    expect(healthFraction(10, 0)).toBe(0);
    expect(healthFraction(Number.NaN, 100)).toBe(0);
    expect(healthFraction(10, Number.NaN)).toBe(0);
  });

  it("scales the bar fill horizontally with the fraction", () => {
    expect(healthBarScale(1)).toBe(1);
    expect(healthBarScale(0.25)).toBe(0.25);
    expect(healthBarScale(0)).toBe(0);
    expect(healthBarScale(2)).toBe(1);
    expect(healthBarScale(-1)).toBe(0);
  });

  it("goes green → amber → red as HP drops", () => {
    expect(healthBarColor(1).getHexString()).toBe(
      new Color(HEALTH_BAR_FULL_COLOR).getHexString(),
    );
    expect(healthBarColor(0.5).getHexString()).toBe(
      new Color(HEALTH_BAR_MID_COLOR).getHexString(),
    );
    expect(healthBarColor(0).getHexString()).toBe(
      new Color(HEALTH_BAR_LOW_COLOR).getHexString(),
    );
  });

  it("moves the colour monotonically towards green as HP rises", () => {
    const low = healthBarColor(0.1);
    const mid = healthBarColor(0.5);
    const full = healthBarColor(1);
    expect(full.g).toBeGreaterThan(mid.g);
    expect(mid.g).toBeGreaterThan(low.g);
    expect(low.r).toBeGreaterThanOrEqual(mid.r);
    expect(mid.r).toBeGreaterThanOrEqual(full.r);
  });
});

describe("health bar removal on death (#168)", () => {
  it("only shows bars for living robots", () => {
    expect(isHealthBarVisible({ health: 1, maxHealth: 100 })).toBe(true);
    expect(isHealthBarVisible({ health: 0, maxHealth: 100 })).toBe(false);
    expect(isHealthBarVisible({ health: 50, maxHealth: 0 })).toBe(false);
  });

  it("drops a robot from the bar list when it dies", () => {
    const alive = createTestRobot({ id: "alive", health: 40 });
    const dead = createTestRobot({ id: "dead", health: 0 });
    const out: (typeof alive | undefined)[] = new Array(4);

    expect(collectHealthBarRobots([alive, dead], out)).toBe(1);
    expect(out[0]).toBe(alive);
    expect(out[1]).toBeUndefined();

    dead.health = 60;
    expect(collectHealthBarRobots([alive, dead], out)).toBe(2);
    expect(out[1]).toBe(dead);

    alive.health = 0;
    expect(collectHealthBarRobots([alive, dead], out)).toBe(1);
    expect(out[0]).toBe(dead);
  });

  it("stops at the buffer capacity", () => {
    const robots = Array.from({ length: 3 }, (_, index) =>
      createTestRobot({ id: `r${index}` }),
    );
    const out: (ReturnType<typeof createTestRobot> | undefined)[] = new Array(
      2,
    );
    expect(collectHealthBarRobots(robots, out)).toBe(2);
  });
});
