/**
 * Match Validator — Victory Detection & Match End State (T020, US1)
 *
 * Analyzes MatchTrace and entity state to determine match outcome:
 * - Victory: One team has units alive, opponent team eliminated
 * - Draw: Both teams eliminated simultaneously or time limit reached
 * - In Progress: Multiple teams still have units alive
 *
 * Used by MatchPlayer and useMatchSimulation to trigger victory state.
 */

import type { EntityState } from "./entityMapper";
import type { MatchTrace } from "./types";

// ============================================================================
// Match Result Types
// ============================================================================

export enum MatchOutcome {
  InProgress = "in-progress",
  Victory = "victory",
  Draw = "draw",
  Timeout = "timeout",
}

export interface MatchResult {
  outcome: MatchOutcome;
  winnerId?: string; // Team ID if Victory
  survivors?: EntityState[]; // Alive entities at end
  timestamp?: number; // When outcome was determined
  reason?: string; // Human-readable explanation
}

// ============================================================================
// Victory Detection
// ============================================================================

/**
 * Analyzes alive entities to determine match outcome.
 *
 * Victory logic:
 * - Exactly one team has > 0 alive units → that team wins
 * - Zero or multiple teams with units → draw
 * - Called after each event or on fixed intervals
 *
 * @param aliveEntities — Entities that have not been killed
 * @param maxTimestampMs — Maximum allowed match duration (for timeout)
 * @param currentTimestampMs — Current time in match
 * @returns MatchResult with outcome and winner (if applicable)
 */
export function validateMatchOutcome(
  aliveEntities: EntityState[],
  maxTimestampMs: number,
  currentTimestampMs: number,
): MatchResult {
  // Check timeout first
  if (currentTimestampMs >= maxTimestampMs) {
    return {
      outcome: MatchOutcome.Timeout,
      survivors: aliveEntities,
      timestamp: currentTimestampMs,
      reason: "Match time limit reached",
    };
  }

  // If no entities alive → draw
  if (aliveEntities.length === 0) {
    return {
      outcome: MatchOutcome.Draw,
      survivors: [],
      timestamp: currentTimestampMs,
      reason: "All units eliminated",
    };
  }

  // Count teams with alive units
  const teamsWithUnits = new Map<string, EntityState[]>();
  for (const entity of aliveEntities) {
    const teamUnits = teamsWithUnits.get(entity.teamId) || [];
    teamUnits.push(entity);
    teamsWithUnits.set(entity.teamId, teamUnits);
  }

  // Single team with units → victory
  if (teamsWithUnits.size === 1) {
    const [winnerId, survivors] = Array.from(teamsWithUnits.entries())[0];
    return {
      outcome: MatchOutcome.Victory,
      winnerId,
      survivors,
      timestamp: currentTimestampMs,
      reason: `Team ${winnerId} has ${survivors.length} unit(s) remaining`,
    };
  }

  // Multiple teams with units → in progress
  return {
    outcome: MatchOutcome.InProgress,
    survivors: aliveEntities,
    timestamp: currentTimestampMs,
    reason: `${teamsWithUnits.size} teams still active`,
  };
}

/**
 * Checks if match outcome has changed from one state to another.
 *
 * Used to detect the exact moment a victory occurs (e.g., for UI feedback).
 *
 * @param previousOutcome — Last known outcome
 * @param currentOutcome — Current outcome after processing events
 * @returns true if outcome changed (e.g., InProgress → Victory)
 */
export function outcomeChanged(
  previousOutcome: MatchOutcome | null,
  currentOutcome: MatchOutcome,
): boolean {
  if (previousOutcome === null) {
    return currentOutcome !== MatchOutcome.InProgress;
  }
  return previousOutcome !== currentOutcome;
}

/**
 * Extracts max timestamp from MatchTrace (match duration).
 *
 * @param trace — Complete MatchTrace
 * @returns Maximum event timestamp in milliseconds
 */
export function getMaxTimestamp(trace: MatchTrace): number {
  if (trace.events.length === 0) {
    return 0;
  }
  return Math.max(...trace.events.map((e) => e.timestampMs));
}

/**
 * Determines if match is terminal (finished, not continuing).
 *
 * @param outcome — Current MatchOutcome
 * @returns true if match has ended (Victory, Draw, or Timeout)
 */
export function isTerminal(outcome: MatchOutcome): boolean {
  return (
    outcome === MatchOutcome.Victory ||
    outcome === MatchOutcome.Draw ||
    outcome === MatchOutcome.Timeout
  );
}

/**
 * Formats match result for display (T020-A: Victory detection UI).
 *
 * @param result — MatchResult from validateMatchOutcome
 * @returns Human-readable result string
 */
export function formatMatchResult(result: MatchResult): string {
  switch (result.outcome) {
    case MatchOutcome.Victory:
      return `🎉 Team ${result.winnerId} Victory! (${result.survivors?.length ?? 0} survivors)`;
    case MatchOutcome.Draw:
      return "🤝 Match Ended in Draw";
    case MatchOutcome.Timeout:
      return "⏱️ Match Time Limit Reached (Draw)";
    case MatchOutcome.InProgress:
      return `⚔️ Match In Progress (${result.survivors?.length ?? 0} units alive)`;
    default:
      return "❓ Unknown Match State";
  }
}

/**
 * Helper: Find winning team from trace (for validation/testing).
 *
 * Scans all death events to find which team eliminated all opponents.
 * Useful for post-match analysis and contract validation.
 *
 * @param trace — Complete MatchTrace
 * @param aliveEntities — Current alive entities
 * @returns Winning team ID if match is finished, undefined otherwise
 */
export function findWinningTeam(
  trace: MatchTrace,
  aliveEntities: EntityState[],
): string | undefined {
  if (aliveEntities.length === 0) {
    return undefined;
  }

  const teamsWithUnits = new Map<string, number>();
  for (const entity of aliveEntities) {
    const count = (teamsWithUnits.get(entity.teamId) ?? 0) + 1;
    teamsWithUnits.set(entity.teamId, count);
  }

  if (teamsWithUnits.size === 1) {
    return Array.from(teamsWithUnits.keys())[0];
  }

  return undefined;
}
