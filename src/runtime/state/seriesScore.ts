import { TEAM_IDENTITIES, type TeamId } from "../../lib/teamConfig";

/**
 * Best-of series score for a session (#170).
 *
 * Runtime/UI state only: it lives in React, survives rounds and resets, and is
 * never read by the simulation.
 */
export interface SeriesScore {
  /** Rounds won by each team. */
  red: number;
  blue: number;
  /** Rounds without a winner. */
  draws: number;
  /** Rounds played, including draws. */
  rounds: number;
}

export const EMPTY_SERIES: SeriesScore = Object.freeze({
  red: 0,
  blue: 0,
  draws: 0,
  rounds: 0,
});

/** Adds one finished round to the series. Never mutates the input. */
export function recordRound(
  series: SeriesScore,
  winner: TeamId | null,
  isDraw: boolean,
): SeriesScore {
  if (winner == null && !isDraw) {
    // No result yet (or a victory without a team): do not count the round.
    return series;
  }
  return {
    red: series.red + (winner === "red" ? 1 : 0),
    blue: series.blue + (winner === "blue" ? 1 : 0),
    draws: series.draws + (isDraw ? 1 : 0),
    rounds: series.rounds + 1,
  };
}

/** Team with more round wins, or null when the series is level. */
export function seriesLeader(series: SeriesScore): TeamId | null {
  if (series.red === series.blue) return null;
  return series.red > series.blue ? "red" : "blue";
}

export function isSeriesEmpty(series: SeriesScore): boolean {
  return series.rounds === 0;
}

/** One-line series readout shared by the match-end card and the summary. */
export function formatSeriesLine(series: SeriesScore): string {
  const red = TEAM_IDENTITIES.red.label;
  const blue = TEAM_IDENTITIES.blue.label;
  const draws = series.draws > 0 ? ` · ${series.draws} drawn` : "";
  return `Series · ${red} ${series.red} – ${series.blue} ${blue}${draws}`;
}
