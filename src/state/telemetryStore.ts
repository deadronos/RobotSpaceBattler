import { create } from "zustand";

import { TeamId } from "../lib/teamConfig";

/** Event representing a robot spawn. */
export interface SpawnEvent {
  type: "spawn";
  timestampMs: number;
  sequenceId: number;
  entityId: string;
  teamId: TeamId;
}

/** Event representing a weapon fire. */
export interface FireEvent {
  type: "fire";
  timestampMs: number;
  sequenceId: number;
  entityId: string;
  teamId: TeamId;
}

/** Event representing damage dealt. */
export interface DamageEvent {
  type: "damage";
  timestampMs: number;
  sequenceId: number;
  attackerId: string;
  targetId: string;
  teamId: TeamId;
  amount: number;
}

/** Event representing a robot death. */
export interface DeathEvent {
  type: "death";
  timestampMs: number;
  sequenceId: number;
  entityId: string;
  teamId: TeamId;
  attackerId?: string;
}

/** Event for obstacle movement */
export interface ObstacleMoveEvent {
  type: "obstacle:move";
  timestampMs: number;
  sequenceId: number;
  frameIndex?: number;
  obstacleId: string;
  position?: { x: number; y: number; z: number };
  orientation?: number;
}

/** Event for hazard activation */
export interface HazardActivateEvent {
  type: "hazard:activate";
  timestampMs: number;
  sequenceId: number;
  frameIndex?: number;
  obstacleId: string;
}

/** Event for hazard deactivation */
export interface HazardDeactivateEvent {
  type: "hazard:deactivate";
  timestampMs: number;
  sequenceId: number;
  frameIndex?: number;
  obstacleId: string;
}

/** Event for destructible cover destroyed */
export interface CoverDestroyedEvent {
  type: "cover:destroyed";
  timestampMs: number;
  sequenceId: number;
  frameIndex?: number;
  obstacleId: string;
  destroyedBy?: string;
}

export type TelemetryEvent =
  | SpawnEvent
  | FireEvent
  | DamageEvent
  | DeathEvent
  | ObstacleMoveEvent
  | HazardActivateEvent
  | HazardDeactivateEvent
  | CoverDestroyedEvent;

/** Aggregated stats for a single robot. */
export interface RobotTelemetryStats {
  id: string;
  teamId: TeamId;
  shotsFired: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  deaths: number;
}

/** Aggregated stats for a team. */
export interface TeamTelemetryTotals {
  spawns: number;
  shotsFired: number;
  damageDealt: number;
  damageTaken: number;
  deaths: number;
}

/**
 * State shape for the telemetry store.
 */
export interface TelemetryState {
  /** The ID of the current match. */
  matchId: string | null;
  /**
   * List of all recorded events in the current match.
   *
   * `recordEvent` appends in place, so this array reference is stable for the
   * whole match (#207). Read it through `getState()`; if a subscriber needs to
   * react to new events, subscribe to `eventCount` instead of this array.
   */
  events: TelemetryEvent[];
  /**
   * Number of events recorded in the current match.
   *
   * Cheap, O(1) version counter for `events`: it changes whenever an event is
   * appended, without rebuilding the event log.
   */
  eventCount: number;
  /**
   * Map of robot IDs to their aggregated stats.
   *
   * Updated in place, so the reference is stable for the whole match (#207).
   */
  robots: Record<string, RobotTelemetryStats>;
  /**
   * Map of team IDs to their aggregated totals.
   *
   * Updated in place, so the reference is stable for the whole match (#207).
   */
  teamTotals: Record<TeamId, TeamTelemetryTotals>;
  /** Records a new event. */
  recordEvent: (event: TelemetryEvent) => void;
  /** Resets the store for a new match. */
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
    red: {
      spawns: 0,
      shotsFired: 0,
      damageDealt: 0,
      damageTaken: 0,
      deaths: 0,
    },
    blue: {
      spawns: 0,
      shotsFired: 0,
      damageDealt: 0,
      damageTaken: 0,
      deaths: 0,
    },
  };
}

/**
 * Zustand store for managing match telemetry data.
 *
 * Recording is amortised O(1): `recordEvent` appends to the event log and
 * mutates the aggregates in place, then bumps `eventCount` so the store still
 * notifies subscribers (#207).
 */
export const useTelemetryStore = create<TelemetryState>((set) => ({
  matchId: null,
  events: [],
  eventCount: 0,
  robots: {},
  teamTotals: createTeamTotals(),
  reset: (matchId) =>
    set({
      matchId: matchId ?? null,
      events: [],
      eventCount: 0,
      robots: {},
      teamTotals: createTeamTotals(),
    }),
  recordEvent: (event) =>
    set((state) => {
      // Append in place: copying the log made every event O(n) and a whole
      // match O(n²). Nothing in `src/` subscribes to `events` any more (#206),
      // so readers use `getState().events` and the reference can stay put.
      state.events.push(event);

      const { robots, teamTotals } = state;

      const ensureRobot = (id: string, teamId: TeamId): RobotTelemetryStats => {
        const existing = robots[id];
        if (existing) {
          existing.teamId = teamId;
          return existing;
        }

        const stats = createRobotStats(id, teamId);
        robots[id] = stats;
        return stats;
      };

      switch (event.type) {
        case "spawn": {
          ensureRobot(event.entityId, event.teamId);
          teamTotals[event.teamId].spawns += 1;
          break;
        }
        case "fire": {
          const robot = ensureRobot(event.entityId, event.teamId);
          robot.shotsFired += 1;
          teamTotals[event.teamId].shotsFired += 1;
          break;
        }
        case "damage": {
          const attacker = ensureRobot(event.attackerId, event.teamId);
          attacker.damageDealt += event.amount;
          teamTotals[event.teamId].damageDealt += event.amount;

          const target = robots[event.targetId];
          if (target) {
            target.damageTaken += event.amount;
            teamTotals[target.teamId].damageTaken += event.amount;
          }
          break;
        }
        case "death": {
          const deceased = ensureRobot(event.entityId, event.teamId);
          deceased.deaths += 1;
          teamTotals[event.teamId].deaths += 1;

          if (event.attackerId) {
            const attacker = robots[event.attackerId];
            if (attacker) {
              attacker.kills += 1;
            }
          }
          break;
        }
        case "obstacle:move":
        case "hazard:activate":
        case "hazard:deactivate":
        case "cover:destroyed":
          // These events are recorded but do not affect robot/team aggregates
          break;
        default:
          break;
      }

      // Bump the version counter instead of rebuilding the log, so subscribers
      // are still notified at O(1) cost.
      return { eventCount: state.eventCount + 1 };
    }),
}));
