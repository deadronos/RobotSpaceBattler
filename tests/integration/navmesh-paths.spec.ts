// @vitest-environment node
/**
 * End-to-end navmesh coverage (#217).
 *
 * The navmesh used to be generated at (0, 0) while the arena lives in
 * [-48, 48], so live path requests returned `no_path` almost always. With the
 * offset fixed and stale paths re-requested, a headless match should mostly
 * find paths and still resolve long before the time limit.
 */

import { describe, expect, it } from "vitest";

import { MATCH_TIME_LIMIT_MS } from "../../src/lib/constants";
import { runHeadlessMatch } from "../helpers/headlessMatch";

const SEEDS = [1, 7, 42, 99, 1234];
const MAX_STEPS = 60 * 200;

describe("headless matches with navmesh paths", () => {
  it("finds paths for most requests and resolves well before the time limit", () => {
    for (const seed of SEEDS) {
      const result = runHeadlessMatch({
        seed,
        pathfindingMode: "inline",
        maxSteps: MAX_STEPS,
      });

      const { calculations, cacheHits, noPath, failures } = result.paths;
      const found = calculations + cacheHits;
      const attempted = found + noPath;

      expect(failures).toBe(0);
      expect(attempted).toBeGreaterThan(0);
      // Before the fix this was ~2-5% (over 1000 no_path results per match).
      expect(found / attempted).toBeGreaterThanOrEqual(0.8);

      expect(result.phase).toBe("victory");
      expect(result.isDraw).toBe(false);
      expect(result.elapsedMs).toBeLessThan(MATCH_TIME_LIMIT_MS * 0.75);
    }
  }, 300_000);

  it("replays identically with path invalidation enabled", () => {
    const a = runHeadlessMatch({ seed: 7, pathfindingMode: "inline" });
    const b = runHeadlessMatch({ seed: 7, pathfindingMode: "inline" });

    expect(a.paths.calculations).toBeGreaterThan(0);
    expect(b.paths).toEqual(a.paths);
    expect(b.stateHash).toBe(a.stateHash);
  }, 300_000);
});
