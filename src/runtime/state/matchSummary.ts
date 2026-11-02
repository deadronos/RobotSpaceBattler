import type { UnitRole } from "../../ecs/worldTypes";
import type { TeamId } from "../../lib/teamConfig";
import type {
  TeamTelemetryTotals,
  RobotTelemetryStats,
} from "../../state/telemetryStore";

/**
 * Post-match summary (#170).
 *
 * This is runtime/UI state only: it is built from telemetry and the robot roles
 * at match end, and nothing here is ever written back into the simulation.
 */
export interface RoleBreakdown {
  role: UnitRole;
  robots: number;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  deaths: number;
}

export interface RobotSummary {
  id: string;
  team: TeamId;
  /** Role from the ECS at match end, or null when the robot is unknown. */
  role: UnitRole | null;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  deaths: number;
  shotsFired: number;
  /** MVP ranking score: kills weigh more than raw damage. */
  score: number;
}

export interface TeamSummary {
  team: TeamId;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  deaths: number;
  shotsFired: number;
  /** Per-role totals, only for roles that were on the field. */
  byRole: RoleBreakdown[];
}

export interface MatchSummary {
  winner: TeamId | null;
  isDraw: boolean;
  durationMs: number;
  teams: Record<TeamId, TeamSummary>;
  /** Best first, so the table is already ranked. */
  robots: RobotSummary[];
  mvp: RobotSummary | null;
}

/** Fixed role order for display, independent of spawn order. */
export const ROLES: readonly UnitRole[] = [
  "assault",
  "tank",
  "sniper",
  "medic",
];

export interface MatchSummaryInput {
  winner: TeamId | null;
  isDraw: boolean;
  durationMs: number;
  robots: Record<string, RobotTelemetryStats>;
  teamTotals: Record<TeamId, TeamTelemetryTotals>;
  /** Robot id → role, read from the ECS when the match ended. */
  roles: Record<string, UnitRole | undefined>;
}

/** Score used for the MVP and the ranking: a kill is worth more than damage. */
export function robotScore(stats: {
  kills: number;
  damageDealt: number;
  deaths: number;
}): number {
  return stats.kills * 2 + stats.damageDealt - stats.deaths * 2;
}

function compareRobots(a: RobotSummary, b: RobotSummary): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.kills !== a.kills) return b.kills - a.kills;
  if (b.damageDealt !== a.damageDealt) return b.damageDealt - a.damageDealt;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function buildTeam(
  team: TeamId,
  robots: RobotSummary[],
  totals: TeamTelemetryTotals,
): TeamSummary {
  const own = robots.filter((robot) => robot.team === team);
  const byRole: RoleBreakdown[] = [];
  for (const role of ROLES) {
    const ofRole = own.filter((robot) => robot.role === role);
    if (ofRole.length === 0) continue;
    const breakdown: RoleBreakdown = {
      role,
      robots: ofRole.length,
      kills: 0,
      damageDealt: 0,
      damageTaken: 0,
      deaths: 0,
    };
    for (const robot of ofRole) {
      breakdown.kills += robot.kills;
      breakdown.damageDealt += robot.damageDealt;
      breakdown.damageTaken += robot.damageTaken;
      breakdown.deaths += robot.deaths;
    }
    byRole.push(breakdown);
  }

  let kills = 0;
  for (const robot of own) {
    kills += robot.kills;
  }

  return {
    team,
    kills,
    damageDealt: totals.damageDealt,
    damageTaken: totals.damageTaken,
    deaths: totals.deaths,
    shotsFired: totals.shotsFired,
    byRole,
  };
}

/**
 * Prefers the winning team for the MVP; falls back to the whole field for a
 * draw. Ties break deterministically so the same match always names the same
 * MVP.
 */
function pickMvp(
  robots: RobotSummary[],
  winner: TeamId | null,
): RobotSummary | null {
  const pool =
    winner != null ? robots.filter((robot) => robot.team === winner) : robots;
  const candidates = pool.length > 0 ? pool : robots;
  return candidates[0] ?? null;
}

/** Builds the immutable summary shown on the match-end screen. */
export function buildMatchSummary(input: MatchSummaryInput): MatchSummary {
  const robots: RobotSummary[] = Object.values(input.robots).map((stats) => {
    const role = input.roles[stats.id] ?? null;
    return {
      id: stats.id,
      team: stats.teamId,
      role,
      kills: stats.kills,
      damageDealt: stats.damageDealt,
      damageTaken: stats.damageTaken,
      deaths: stats.deaths,
      shotsFired: stats.shotsFired,
      score: robotScore(stats),
    };
  });
  robots.sort(compareRobots);

  return {
    winner: input.winner,
    isDraw: input.isDraw,
    durationMs: input.durationMs,
    teams: {
      red: buildTeam("red", robots, input.teamTotals.red),
      blue: buildTeam("blue", robots, input.teamTotals.blue),
    },
    robots,
    mvp: pickMvp(robots, input.winner),
  };
}

/** Formats a match duration as `m:ss` (rounds down to the second). */
export function formatMatchDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
