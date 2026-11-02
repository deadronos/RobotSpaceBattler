// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { TeamId } from "../../src/lib/teamConfig";
import {
  buildMatchSummary,
  formatMatchDuration,
  robotScore,
  ROLES,
  type MatchSummaryInput,
} from "../../src/runtime/state/matchSummary";
import type {
  RobotTelemetryStats,
  TeamTelemetryTotals,
} from "../../src/state/telemetryStore";

function robot(
  id: string,
  teamId: TeamId,
  stats: Partial<RobotTelemetryStats> = {},
): RobotTelemetryStats {
  return {
    id,
    teamId,
    shotsFired: 10,
    damageDealt: 50,
    damageTaken: 20,
    kills: 1,
    deaths: 0,
    ...stats,
  };
}

function totals(overrides: Partial<TeamTelemetryTotals> = {}) {
  return {
    spawns: 2,
    shotsFired: 20,
    damageDealt: 100,
    damageTaken: 40,
    deaths: 1,
    ...overrides,
  };
}

function input(overrides: Partial<MatchSummaryInput> = {}): MatchSummaryInput {
  return {
    winner: "red",
    isDraw: false,
    durationMs: 125_000,
    robots: {
      "red-1": robot("red-1", "red", { kills: 3, damageDealt: 200 }),
      "red-2": robot("red-2", "red"),
      "blue-1": robot("blue-1", "blue", { kills: 2, damageDealt: 150 }),
    },
    teamTotals: { red: totals(), blue: totals({ deaths: 3 }) },
    roles: { "red-1": "tank", "red-2": "assault", "blue-1": "sniper" },
    ...overrides,
  };
}

describe("buildMatchSummary", () => {
  it("keeps the result and duration and copies the team totals", () => {
    const summary = buildMatchSummary(input());

    expect(summary.winner).toBe("red");
    expect(summary.isDraw).toBe(false);
    expect(summary.durationMs).toBe(125_000);
    expect(summary.teams.red).toMatchObject({
      team: "red",
      damageDealt: 100,
      damageTaken: 40,
      deaths: 1,
      shotsFired: 20,
    });
    expect(summary.teams.blue.deaths).toBe(3);
  });

  it("sums per-team kills from the robots", () => {
    const summary = buildMatchSummary(input());
    expect(summary.teams.red.kills).toBe(4);
    expect(summary.teams.blue.kills).toBe(2);
  });

  it("breaks teams down per role in a fixed order, skipping empty roles", () => {
    const summary = buildMatchSummary(input());

    expect(summary.teams.red.byRole.map((entry) => entry.role)).toEqual([
      "assault",
      "tank",
    ]);
    expect(summary.teams.blue.byRole.map((entry) => entry.role)).toEqual([
      "sniper",
    ]);
    expect(summary.teams.red.byRole[1]).toEqual({
      role: "tank",
      robots: 1,
      kills: 3,
      damageDealt: 200,
      damageTaken: 20,
      deaths: 0,
    });
    expect(ROLES).toEqual(["assault", "tank", "sniper", "medic"]);
  });

  it("ranks robots by score, then kills, damage and id", () => {
    const summary = buildMatchSummary(
      input({
        robots: {
          "red-3": robot("red-3", "red", { kills: 3, damageDealt: 0 }),
          "red-2": robot("red-2", "red", { kills: 1, damageDealt: 300 }),
          "red-1": robot("red-1", "red", { kills: 1, damageDealt: 300 }),
        },
        roles: { "red-1": "assault", "red-2": "assault", "red-3": "assault" },
      }),
    );

    // red-1 and red-2 tie on score, kills and damage, so the id breaks the tie.
    expect(summary.robots.map((entry) => entry.id)).toEqual([
      "red-1",
      "red-2",
      "red-3",
    ]);
  });

  it("names an MVP from the winning team", () => {
    const summary = buildMatchSummary(
      input({
        robots: {
          "red-1": robot("red-1", "red", { kills: 1, damageDealt: 10 }),
          "blue-1": robot("blue-1", "blue", { kills: 5, damageDealt: 500 }),
        },
        roles: { "red-1": "assault", "blue-1": "assault" },
      }),
    );

    expect(summary.mvp?.id).toBe("red-1");
    expect(summary.robots[0]?.id).toBe("blue-1");
  });

  it("picks the field's best robot when the round is a draw", () => {
    const summary = buildMatchSummary(
      input({
        winner: null,
        isDraw: true,
        teamTotals: { red: totals(), blue: totals() },
      }),
    );

    expect(summary.isDraw).toBe(true);
    expect(summary.mvp?.id).toBe("red-1");
  });

  it("has no MVP without robots and tolerates an unknown role", () => {
    const summary = buildMatchSummary(
      input({
        robots: {
          "red-9": robot("red-9", "red", {
            kills: 0,
            damageDealt: 0,
            deaths: 1,
          }),
        },
        roles: {},
      }),
    );

    expect(summary.robots[0]?.role).toBeNull();
    expect(summary.robots[0]?.score).toBe(-2);
    expect(summary.teams.red.byRole).toEqual([]);

    const empty = buildMatchSummary(input({ robots: {}, roles: {} }));
    expect(empty.robots).toEqual([]);
    expect(empty.mvp).toBeNull();
  });
});

describe("robotScore", () => {
  it("weighs kills and deaths above raw damage", () => {
    expect(robotScore({ kills: 2, damageDealt: 100, deaths: 1 })).toBe(102);
  });
});

describe("formatMatchDuration", () => {
  it("renders m:ss and never goes negative", () => {
    expect(formatMatchDuration(0)).toBe("0:00");
    expect(formatMatchDuration(9_000)).toBe("0:09");
    expect(formatMatchDuration(125_000)).toBe("2:05");
    expect(formatMatchDuration(-5_000)).toBe("0:00");
  });
});
