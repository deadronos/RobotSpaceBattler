import { create } from "zustand";

import { TeamId } from "../ecs/world";
import {
  MatchTraceEvent,
  MatchTraceEventType,
} from "../runtime/matchTrace";

export interface RobotTelemetry {
  id: string;
  teamId: TeamId;
  shotsFired: number;
  hits: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
  spawnTimestampMs: number;
  deathTimestampMs: number | null;
  timeAliveMs: number;
}

export interface TeamTelemetryTotals {
  shotsFired: number;
  hits: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
}

interface TelemetryState {
  matchId: string | null;
  lastEventTimestampMs: number;
  robots: Record<string, RobotTelemetry>;
  teamTotals: Record<TeamId, TeamTelemetryTotals>;
  reset: (matchId: string) => void;
  recordEvent: (event: MatchTraceEvent) => void;
  finalizeLiveRobots: (timestampMs: number) => void;
}

const createTeamTotals = (): TeamTelemetryTotals => ({
  shotsFired: 0,
  hits: 0,
  damageDealt: 0,
  damageTaken: 0,
  kills: 0,
  deaths: 0,
});

const ensureTeamTotals = (
  totals: Record<TeamId, TeamTelemetryTotals>,
  teamId: TeamId,
): TeamTelemetryTotals => {
  if (!totals[teamId]) {
    totals[teamId] = createTeamTotals();
  }
  return totals[teamId];
};

const ensureRobot = (
  robots: Record<string, RobotTelemetry>,
  teamTotals: Record<TeamId, TeamTelemetryTotals>,
  id: string,
  teamId: TeamId | undefined,
  timestampMs: number,
): RobotTelemetry | null => {
  if (!teamId) {
    return null;
  }

  if (!robots[id]) {
    robots[id] = {
      id,
      teamId,
      shotsFired: 0,
      hits: 0,
      damageDealt: 0,
      damageTaken: 0,
      kills: 0,
      deaths: 0,
      spawnTimestampMs: timestampMs,
      deathTimestampMs: null,
      timeAliveMs: 0,
    };
  }

  ensureTeamTotals(teamTotals, robots[id].teamId);
  return robots[id];
};

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  matchId: null,
  lastEventTimestampMs: 0,
  robots: {},
  teamTotals: {
    red: createTeamTotals(),
    blue: createTeamTotals(),
  },
  reset: (matchId) =>
    set({
      matchId,
      lastEventTimestampMs: 0,
      robots: {},
      teamTotals: {
        red: createTeamTotals(),
        blue: createTeamTotals(),
      },
    }),
  finalizeLiveRobots: (timestampMs) =>
    set((state) => {
      const robots = { ...state.robots };
      Object.values(robots).forEach((robot) => {
        if (robot.deathTimestampMs === null) {
          robot.timeAliveMs = Math.max(
            robot.timeAliveMs,
            timestampMs - robot.spawnTimestampMs,
          );
        }
      });
      return { robots, lastEventTimestampMs: timestampMs };
    }),
  recordEvent: (event) =>
    set((state) => {
      const robots = { ...state.robots };
      const teamTotals = {
        red: { ...state.teamTotals.red },
        blue: { ...state.teamTotals.blue },
      };

      const timestampMs =
        event.timestampMs ?? state.lastEventTimestampMs;

      const applyDeath = (
        targetId: string | undefined,
        attackerId: string | undefined,
      ) => {
        if (!targetId) {
          return;
        }
        const target = robots[targetId];
        if (target) {
          const totals = ensureTeamTotals(teamTotals, target.teamId);
          target.deaths += 1;
          target.deathTimestampMs = timestampMs;
          target.timeAliveMs = Math.max(
            target.timeAliveMs,
            timestampMs - target.spawnTimestampMs,
          );
          totals.deaths += 1;
        }

        if (attackerId) {
          const attacker = robots[attackerId];
          if (attacker) {
            attacker.kills += 1;
            ensureTeamTotals(teamTotals, attacker.teamId).kills += 1;
          }
        }
      };

      switch (event.type as MatchTraceEventType) {
        case "spawn": {
          if (!event.entityId || !event.teamId) {
            break;
          }
          ensureRobot(robots, teamTotals, event.entityId, event.teamId, timestampMs);
          break;
        }
        case "fire": {
          if (!event.entityId) {
            break;
          }
          const robot = robots[event.entityId];
          if (robot) {
            robot.shotsFired += 1;
            ensureTeamTotals(teamTotals, robot.teamId).shotsFired += 1;
          }
          break;
        }
        case "damage": {
          const attackerId = event.attackerId;
          const targetId = event.targetId;
          const amount = event.amount ?? 0;

          if (attackerId) {
            const attacker = robots[attackerId];
            if (attacker) {
              attacker.damageDealt += amount;
              attacker.hits += 1;
              const totals = ensureTeamTotals(teamTotals, attacker.teamId);
              totals.damageDealt += amount;
              totals.hits += 1;
            }
          }

          if (targetId) {
            const target = robots[targetId];
            if (target) {
              target.damageTaken += amount;
              ensureTeamTotals(teamTotals, target.teamId).damageTaken += amount;
            }
          }
          break;
        }
        case "death": {
          applyDeath(event.entityId, event.attackerId);
          break;
        }
        default:
          break;
      }

      return {
        robots,
        teamTotals,
        lastEventTimestampMs: timestampMs,
      };
    }),
}));

export function selectRobotStatsByTeam(team: TeamId) {
  return (state: TelemetryState) =>
    Object.values(state.robots)
      .filter((robot) => robot.teamId === team)
      .sort((a, b) => {
        if (b.kills !== a.kills) {
          return b.kills - a.kills;
        }
        if (b.damageDealt !== a.damageDealt) {
          return b.damageDealt - a.damageDealt;
        }
        return a.spawnTimestampMs - b.spawnTimestampMs;
      });
}

export function selectTopRobots(limit: number) {
  return (state: TelemetryState) =>
    Object.values(state.robots)
      .slice()
      .sort((a, b) => {
        if (b.damageDealt !== a.damageDealt) {
          return b.damageDealt - a.damageDealt;
        }
        if (b.kills !== a.kills) {
          return b.kills - a.kills;
        }
        return (b.timeAliveMs ?? 0) - (a.timeAliveMs ?? 0);
      })
      .slice(0, limit);
}

export function selectTeamTotals(team: TeamId) {
  return (state: TelemetryState) => state.teamTotals[team];
}
