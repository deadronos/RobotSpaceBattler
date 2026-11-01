import { describe, expect, it } from "vitest";

import { generateTeamConfigs } from "../../src/lib/teamConfig";
import { runHeadlessMatch } from "../helpers/headlessMatch";

// Fixed seed list shared by both checks so failures are reproducible.
const SEED_COUNT = 200;
const seeds = Array.from({ length: SEED_COUNT }, (_, k) => k * 7919 + 3);

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe("seeded team symmetry", () => {
  it("generates mirrored spawn geometry for both teams", () => {
    const redCenterX: number[] = [];
    const blueCenterX: number[] = [];
    const redCenterZ: number[] = [];
    const blueCenterZ: number[] = [];
    const redOuterX: number[] = [];
    const blueOuterX: number[] = [];

    for (const seed of seeds) {
      const { red, blue } = generateTeamConfigs(seed);
      redCenterX.push(red.spawnCenter.x);
      blueCenterX.push(blue.spawnCenter.x);
      redCenterZ.push(red.spawnCenter.z);
      blueCenterZ.push(blue.spawnCenter.z);
      redOuterX.push(Math.min(...red.spawnPoints.map((p) => p.x)));
      blueOuterX.push(Math.max(...blue.spawnPoints.map((p) => p.x)));
    }

    // Team centres are mirrored around the arena centre with random jitter.
    // A biased RNG shifts both teams in the same direction, which shows up as
    // a non-zero sum of the two means.
    expect(Math.abs(mean(redCenterX) + mean(blueCenterX))).toBeLessThan(1);
    expect(Math.abs(mean(redCenterZ) + mean(blueCenterZ))).toBeLessThan(1);

    // The outermost spawn column is pushed away from the arena centre. The
    // two teams must end up equally far out, otherwise one side starts closer
    // to the perimeter wall.
    expect(Math.abs(mean(redOuterX) + mean(blueOuterX))).toBeLessThan(2);
  });
});

describe("seeded match balance", () => {
  it("splits headless matches roughly evenly between red and blue", () => {
    const wins: Record<"red" | "blue" | "draw", number> = {
      red: 0,
      blue: 0,
      draw: 0,
    };

    for (const seed of seeds) {
      const result = runHeadlessMatch({ seed });
      if (result.isDraw) wins.draw += 1;
      else if (result.winner === "red") wins.red += 1;
      else if (result.winner === "blue") wins.blue += 1;
    }

    const decided = wins.red + wins.blue;
    // A guard test only means something if most matches actually resolve.
    expect(decided).toBeGreaterThanOrEqual(SEED_COUNT * 0.9);

    const redRate = wins.red / decided;
    const blueRate = wins.blue / decided;
    // Agreed tolerance: +/-8 percentage points around 50/50. With 200 seeds
    // that is ~2.3 standard deviations, so a fair simulation passes with
    // margin while the pre-fix 60/40 split fails.
    expect(redRate).toBeGreaterThanOrEqual(0.42);
    expect(redRate).toBeLessThanOrEqual(0.58);
    expect(blueRate).toBeGreaterThanOrEqual(0.42);
    expect(blueRate).toBeLessThanOrEqual(0.58);
  }, 300_000);
});
