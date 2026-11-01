// @vitest-environment node
import { describe, expect, it } from "vitest";

import { runHeadlessMatch } from "../helpers/headlessMatch";
import { fnv1a, runScenarioDigest } from "../helpers/aiScenario";

/**
 * Golden digests captured from the brute-force (all-pairs) implementation
 * before the spatial index landed (#171). The indexed implementation must
 * reproduce them bit for bit.
 *
 * SCENARIO_GOLDEN and MATCH_GOLDEN were recaptured for #192: the seeded RNG
 * returned signed values, so fixing it changed spawn jitter and the
 * TEAM_CONFIGS-derived AI anchors, which intentionally changes outcomes. Each
 * value was re-verified as run-to-run stable (same seed, identical digest)
 * before being committed.
 *
 * MATCH_GOLDEN was previously recaptured for #200: swept projectile-vs-obstacle
 * hits and exact rocket impact points also change full-match outcomes.
 *
 * All values were recaptured for #215: the AI now derives retreat, cover and
 * formation anchors from the match's seeded `battleWorld.teams` instead of the
 * fixed seed-0 `TEAM_CONFIGS`, and `buildScenarioWorld` seeds the match teams
 * too. Digests were re-verified as run-to-run stable (same seed, identical
 * digest in repeated and separate runs) before being committed.
 */
const SCENARIO_GOLDEN: Record<string, string> = {
  "20x400": "7396671e",
  "100x300": "fa36d2d8",
  "200x200": "3fd497ef",
};

const MATCH_GOLDEN: Record<number, string> = {
  1: "678c5935",
  42: "d4e481f9",
};

function matchDigest(seed: number): string {
  const r = runHeadlessMatch({ seed });
  return fnv1a(
    JSON.stringify([r.winner, r.steps, r.elapsedMs, r.counts, r.robots]),
  );
}

describe("AI spatial index parity with brute force", () => {
  for (const key of Object.keys(SCENARIO_GOLDEN)) {
    const [count, ticks] = key.split("x").map(Number);
    it(`scenario ${count} robots / ${ticks} ticks is unchanged`, () => {
      expect(runScenarioDigest(count, ticks)).toBe(SCENARIO_GOLDEN[key]);
    }, 60000);
  }

  for (const seed of Object.keys(MATCH_GOLDEN).map(Number)) {
    it(`headless full match seed ${seed} outcome is unchanged`, () => {
      expect(matchDigest(seed)).toBe(MATCH_GOLDEN[seed]);
    }, 60000);
  }
});
