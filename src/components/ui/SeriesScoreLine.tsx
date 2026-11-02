import { TEAM_IDENTITIES } from "../../lib/teamConfig";
import {
  formatSeriesLine,
  type SeriesScore,
} from "../../runtime/state/seriesScore";

interface SeriesScoreLineProps {
  series: SeriesScore;
}

/**
 * One-line series readout with a per-team shape/colour cue (#166, #170).
 *
 * The visible text is identical to `formatSeriesLine`, so existing screen
 * readers and tests see the same string. The markers are CSS `::before`
 * decoration on the team-name spans, coloured through the palette variables on
 * `.app-root`.
 */
export function SeriesScoreLine({ series }: SeriesScoreLineProps) {
  return (
    <span className="series-score-line" aria-label={formatSeriesLine(series)}>
      {"Series · "}
      <span className="series-score-team series-score-team-red">
        {TEAM_IDENTITIES.red.label}
      </span>
      {` ${series.red} – ${series.blue} `}
      <span className="series-score-team series-score-team-blue">
        {TEAM_IDENTITIES.blue.label}
      </span>
      {series.draws > 0 ? ` · ${series.draws} drawn` : ""}
    </span>
  );
}
