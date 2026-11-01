// @vitest-environment node
import { describe, expect, it } from "vitest";

import { MATCH_TIME_LIMIT_MS } from "../../src/lib/constants";
import type { TeamId } from "../../src/lib/teamConfig";
import { runHeadlessMatch } from "../helpers/headlessMatch";

const DT = 1 / 60;
const MAX_STEPS = 60 * 200;

describe("headless seeded match", () => {
  it("a seeded match runs to a decisive end", () => {
    const result = runHeadlessMatch({ seed: 1 });
    const winner = result.winner as TeamId;
    const loser: TeamId = winner === "red" ? "blue" : "red";

    expect(result.phase).toBe("victory");
    expect(result.steps).toBeLessThan(MAX_STEPS);
    expect(result.isDraw).toBe(false);
    expect(["red", "blue"]).toContain(winner);
    expect(result.survivors[winner]).toBeGreaterThan(0);
    expect(result.survivors[loser]).toBe(0);
    expect(result.elapsedMs).toBeLessThan(MATCH_TIME_LIMIT_MS);
  });

  it("telemetry agrees with the final world", () => {
    const { counts, robots } = runHeadlessMatch({ seed: 1 });

    // Dead robots are removed from the world, so every spawn is either still
    // alive at the end or accounted for by exactly one death event.
    expect(robots.every((r) => r.health > 0)).toBe(true);
    expect(counts.spawns).toBe(20);
    expect(counts.deaths + robots.length).toBe(counts.spawns);
    expect(counts.fires).toBeGreaterThan(0);
    expect(counts.damage).toBeGreaterThan(0);
    expect(counts.damage).toBeGreaterThanOrEqual(counts.deaths);
  });

  it("the same seed replays identically", () => {
    expect(runHeadlessMatch({ seed: 42 })).toEqual(
      runHeadlessMatch({ seed: 42 }),
    );
  });

  it("different seeds produce different matches", () => {
    expect(runHeadlessMatch({ seed: 1 })).not.toEqual(
      runHeadlessMatch({ seed: 99 }),
    );
  });

  it("either team can win", () => {
    const winners = new Set(
      [1, 42, 7, 99].map((seed) => runHeadlessMatch({ seed }).winner),
    );
    expect(winners).toEqual(new Set(["red", "blue"]));
  }, 30000);

  it("a natural match hits the time limit and resolves by tally", () => {
    const limitMs = 5000;
    const result = runHeadlessMatch({ seed: 1, maxMatchDurationMs: limitMs });

    expect(result.phase).toBe("victory");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(limitMs);
    expect(result.elapsedMs).toBeLessThan(limitMs + 2 * DT * 1000);
    expect(result.survivors.red + result.survivors.blue).toBeGreaterThan(0);
    // Exactly one of: a winner is named, or the match is flagged a draw.
    expect([result.winner !== null, result.isDraw]).toContain(true);
    expect(result.winner !== null).not.toBe(result.isDraw);
  });
});
