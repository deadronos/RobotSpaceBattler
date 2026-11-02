import { TEAM_IDENTITIES, type TeamId } from "../../lib/teamConfig";
import type { SeriesScore } from "../../runtime/state/seriesScore";
import { SeriesScoreLine } from "./SeriesScoreLine";

interface MatchEndOverlayProps {
  winner: TeamId | null;
  isDraw: boolean;
  /** Whole seconds until the auto-restart, or null when it is disabled. */
  restartSeconds: number | null;
  autoRestartEnabled: boolean;
  series: SeriesScore;
  onOpenSummary: () => void;
  onOpenBattleStats: () => void;
  onNextRound: () => void;
  onToggleAutoRestart: (enabled: boolean) => void;
}

/**
 * Match-end card (#170): result, series score, restart state and the buttons
 * that lead to the summary or the next round. The winner and the series line
 * carry the per-team shape/colour cue from #166 (CSS variables from the app
 * root, so the palette toggle applies here too).
 */
export function MatchEndOverlay({
  winner,
  isDraw,
  restartSeconds,
  autoRestartEnabled,
  series,
  onOpenSummary,
  onOpenBattleStats,
  onNextRound,
  onToggleAutoRestart,
}: MatchEndOverlayProps) {
  const title = isDraw
    ? "Draw!"
    : winner
      ? `${TEAM_IDENTITIES[winner].label} Triumphs!`
      : "Match over";

  return (
    <div className="app-victory-overlay">
      <h2 className="app-victory-title" data-team={winner ?? "draw"}>
        {title}
      </h2>
      <p className="app-victory-subtitle">
        {restartSeconds != null
          ? `Restarting in ${restartSeconds}s`
          : "Auto-restart is off"}
      </p>
      <p className="app-victory-series" data-testid="series-score">
        <SeriesScoreLine series={series} />
      </p>
      <div className="app-victory-actions">
        <button
          type="button"
          className="app-button app-victory-button"
          onClick={onOpenSummary}
        >
          Match summary
        </button>
        <button
          type="button"
          className="app-button app-secondary-button"
          onClick={onOpenBattleStats}
        >
          Battle stats
        </button>
        <button
          type="button"
          className="app-button app-secondary-button"
          onClick={onNextRound}
        >
          Next round
        </button>
      </div>
      <label className="app-victory-toggle">
        <input
          type="checkbox"
          checked={autoRestartEnabled}
          onChange={(event) => onToggleAutoRestart(event.target.checked)}
        />
        Auto-restart
      </label>
    </div>
  );
}
