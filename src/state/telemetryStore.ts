import { create } from 'zustand';

import { TeamId } from '../lib/teamConfig';

export interface SpawnEvent {
  type: 'spawn';
  timestampMs: number;
  sequenceId: number;
  entityId: string;
  teamId: TeamId;
}

export interface FireEvent {
  type: 'fire';
  timestampMs: number;
  sequenceId: number;
  entityId: string;
  teamId: TeamId;
}

export interface DamageEvent {
  type: 'damage';
  timestampMs: number;
  sequenceId: number;
  attackerId: string;
  targetId: string;
  teamId: TeamId;
  amount: number;
}

export interface DeathEvent {
  type: 'death';
  timestampMs: number;
  sequenceId: number;
  entityId: string;
  teamId: TeamId;
  attackerId?: string;
}

export type TelemetryEvent = SpawnEvent | FireEvent | DamageEvent | DeathEvent;

export interface RobotTelemetryStats {
  id: string;
  teamId: TeamId;
  shotsFired: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
}

export interface TeamTelemetryTotals {
  spawns: number;
  shotsFired: number;
  damageDealt: number;
  damageTaken: number;
  deaths: number;
}

export interface TelemetryState {
  matchId: string | null;
  events: TelemetryEvent[];
  robots: Record<string, RobotTelemetryStats>;
  teamTotals: Record<TeamId, TeamTelemetryTotals>;
  recordEvent: (event: TelemetryEvent) => void;
  reset: (matchId?: string) => void;
}

function createRobotStats(id: string, teamId: TeamId): RobotTelemetryStats {
  return {
    id,
    teamId,
    shotsFired: 0,
    damageDealt: 0,
    damageTaken: 0,
    kills: 0,
    deaths: 0,
  };
}

function createTeamTotals(): Record<TeamId, TeamTelemetryTotals> {
  return {
    red: { spawns: 0, shotsFired: 0, damageDealt: 0, damageTaken: 0, deaths: 0 },
    blue: { spawns: 0, shotsFired: 0, damageDealt: 0, damageTaken: 0, deaths: 0 },
  };
}

function cloneTeamTotals(totals: Record<TeamId, TeamTelemetryTotals>) {
  return {
    red: { ...totals.red },
    blue: { ...totals.blue },
  };
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  matchId: null,
  events: [],
  robots: {},
  teamTotals: createTeamTotals(),
  reset: (matchId) =>
    set({
      matchId: matchId ?? null,
      events: [],
      robots: {},
      teamTotals: createTeamTotals(),
    }),
  recordEvent: (event) =>
    set((state) => {
      const robots = { ...state.robots };
      const teamTotals = cloneTeamTotals(state.teamTotals);

      const ensureRobot = (id: string, teamId: TeamId): RobotTelemetryStats => {
        const existing = robots[id];
        if (existing) {
          if (existing.teamId !== teamId) {
            robots[id] = { ...existing, teamId };
          }
          return robots[id];
        }

        const stats = createRobotStats(id, teamId);
        robots[id] = stats;
        return stats;
      };

      switch (event.type) {
        case 'spawn': {
          ensureRobot(event.entityId, event.teamId);
          teamTotals[event.teamId].spawns += 1;
          break;
        }
        case 'fire': {
          const robot = ensureRobot(event.entityId, event.teamId);
          robots[event.entityId] = {
            ...robot,
            shotsFired: robot.shotsFired + 1,
          };
          teamTotals[event.teamId].shotsFired += 1;
          break;
        }
        case 'damage': {
          const attacker = ensureRobot(event.attackerId, event.teamId);
          robots[event.attackerId] = {
            ...attacker,
            damageDealt: attacker.damageDealt + event.amount,
          };
          teamTotals[event.teamId].damageDealt += event.amount;

          const target = robots[event.targetId];
          if (target) {
            robots[event.targetId] = {
              ...target,
              damageTaken: target.damageTaken + event.amount,
            };
            teamTotals[target.teamId].damageTaken += event.amount;
          }
          break;
        }
        case 'death': {
          const deceased = ensureRobot(event.entityId, event.teamId);
          robots[event.entityId] = {
            ...deceased,
            deaths: deceased.deaths + 1,
          };
          teamTotals[event.teamId].deaths += 1;

          if (event.attackerId) {
            const attacker = robots[event.attackerId];
            if (attacker) {
              robots[event.attackerId] = {
                ...attacker,
                kills: attacker.kills + 1,
              };
            }
          }
          break;
        }
        default:
          break;
      }

      return {
        ...state,
        events: [...state.events, event],
        robots,
        teamTotals,
      };
    }),
}));
