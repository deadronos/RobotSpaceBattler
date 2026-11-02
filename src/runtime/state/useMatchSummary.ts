import { useCallback, useRef, useState } from "react";

import type { BattleWorld } from "../../ecs/world";
import type { UnitRole } from "../../ecs/worldTypes";
import { useTelemetryStore } from "../../state/telemetryStore";
import type { MatchStateSnapshot } from "./matchStateMachine";
import { buildMatchSummary, type MatchSummary } from "./matchSummary";
import { EMPTY_SERIES, recordRound, type SeriesScore } from "./seriesScore";

export interface MatchSummaryTracker {
  /** Summary of the last finished round, or null before the first one. */
  summary: MatchSummary | null;
  /** Series score across rounds. */
  series: SeriesScore;
  /**
   * Called for every match snapshot. Captures the summary and adds the round
   * to the series exactly once, when the snapshot enters the victory phase.
   * @returns True when this snapshot finished a new round, so the caller can
   * open the summary without reopening it on every countdown emission.
   */
  trackSnapshot: (snapshot: MatchStateSnapshot) => boolean;
  /** Clears the series score. The last summary stays readable. */
  resetSeries: () => void;
}

/**
 * Runtime-only match bookkeeping for #170: the post-match summary and the
 * series score. Both are built from telemetry/ECS at the moment of victory and
 * live in React state; nothing here feeds back into the simulation.
 */
export function useMatchSummaryTracker(
  battleWorld: BattleWorld,
): MatchSummaryTracker {
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [series, setSeries] = useState<SeriesScore>(EMPTY_SERIES);
  // The state machine re-emits during the victory phase (countdown seconds,
  // auto-restart toggles), so guard against counting one round more than once.
  const roundRecorded = useRef(false);

  const trackSnapshot = useCallback(
    (snapshot: MatchStateSnapshot): boolean => {
      if (snapshot.phase !== "victory") {
        roundRecorded.current = false;
        return false;
      }
      if (roundRecorded.current) {
        return false;
      }
      roundRecorded.current = true;

      // Roles are not part of the telemetry aggregates, and dead robots stay in
      // the ECS, so read them once at match end.
      const roles: Record<string, UnitRole> = {};
      for (const robot of battleWorld.robots.entities) {
        roles[robot.id] = robot.role;
      }

      const { robots, teamTotals } = useTelemetryStore.getState();
      setSummary(
        buildMatchSummary({
          winner: snapshot.winner,
          isDraw: snapshot.isDraw,
          durationMs: snapshot.elapsedMs,
          robots,
          teamTotals,
          roles,
        }),
      );
      setSeries((current) =>
        recordRound(current, snapshot.winner, snapshot.isDraw),
      );
      return true;
    },
    [battleWorld],
  );

  const resetSeries = useCallback(() => {
    setSeries(EMPTY_SERIES);
  }, []);

  return { summary, series, trackSnapshot, resetSeries };
}
