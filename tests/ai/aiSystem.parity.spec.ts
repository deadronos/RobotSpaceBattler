// @vitest-environment node
import { describe, expect, it } from "vitest";

import { runHeadlessMatch } from "../helpers/headlessMatch";
import { fnv1a, runScenarioDigest } from "../helpers/aiScenario";

/**
 * Golden digests captured from the brute-force (all-pairs) implementation
 * before the spatial index landed (#171). The indexed implementation must
 * reproduce them bit for bit.
 *
 * MATCH_GOLDEN was recaptured for #200: swept projectile-vs-obstacle hits and
 * exact rocket impact points intentionally change full-match outcomes. Each
 * value was re-verified as run-to-run stable (same seed, identical digest)
 * before being committed.
 */
const SCENARIO_GOLDEN: Record<string, string> = {
  "20x400": "8b4c0197",
  "100x300": "fba22784",
  "200x200": "dd794f82",
};

const MATCH_GOLDEN: Record<number, string> = {
  1: "1788e098",
  42: "674b2247",
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
