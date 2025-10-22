import type { Team, WeaponType } from "../../types";

export interface VictoryOverlayTeamSummary {
  teamId: Team | string;
  label: string;
  alive: number;
  eliminated: number;
  weaponDistribution: Record<WeaponType | string, number>;
  captain?: { name: string; alive: boolean } | null;
}

export interface VictoryOverlayActions {
  openStats: () => void;
  openSettings: () => void;
  restartNow: () => void;
  pauseCountdown: () => void;
  resumeCountdown: () => void;
}

export interface VictoryOverlayProps {
  visible: boolean;
  winnerName: string;
  countdownSeconds: number | null;
  performanceHint?: string | null;
  countdownPaused?: boolean;
  teamSummaries: VictoryOverlayTeamSummary[];
  actions: VictoryOverlayActions;
}

function formatCountdown(seconds: number | null): string {
  if (seconds === null) {
    return "Auto-restart paused";
  }

  const normalized = Math.max(0, Math.floor(seconds));
  return `Auto-restarts in ${normalized.toString().padStart(2, "0")}s`;
}

export function VictoryOverlay({
  visible,
  winnerName,
  countdownSeconds,
  performanceHint,
  countdownPaused = false,
  teamSummaries,
  actions,
}: VictoryOverlayProps) {
  if (!visible) {
    return null;
  }

  const countdownLabel = performanceHint ?? formatCountdown(countdownSeconds);
  const pauseLabel = countdownPaused ? "Resume Countdown" : "Pause Countdown";
  const handlePauseClick = () => {
    if (countdownPaused) {
      actions.resumeCountdown();
      return;
    }

    actions.pauseCountdown();
  };

  return (
    <section
      aria-label="Victory Overlay"
      className="victory-overlay"
      role="dialog"
      aria-modal="true"
    >
      <header className="victory-overlay__header">
        <h2 className="victory-overlay__title">{winnerName} Wins</h2>
        <p className="victory-overlay__countdown">{countdownLabel}</p>
      </header>

      <div className="victory-overlay__actions">
        <button type="button" onClick={actions.openStats}>
          Stats
        </button>
        <button type="button" onClick={actions.openSettings}>
          Settings
        </button>
        <button type="button" onClick={actions.restartNow}>
          Restart Now
        </button>
        <button type="button" onClick={handlePauseClick}>
          {pauseLabel}
        </button>
      </div>

      <div className="victory-overlay__teams" aria-label="Team summaries">
        {teamSummaries.map((team) => {
          const captainState = team.captain ?? null;
          const captainLabel = captainState
            ? `Captain ${captainState.alive ? "Active" : "Eliminated"}`
            : "Captain Unknown";

          return (
            <article
              key={team.teamId}
              data-testid={`team-summary-${team.teamId}`}
              className="victory-overlay__team"
            >
              <h3 className="victory-overlay__team-name">{team.label}</h3>
              <p>Alive: {team.alive}</p>
              <p>Eliminated: {team.eliminated}</p>
              <p>{captainLabel}</p>
              <div
                className="victory-overlay__weapons"
                aria-label="Weapon distribution"
              >
                {Object.entries(team.weaponDistribution).map(
                  ([weapon, count]) => (
                    <span key={weapon} className="victory-overlay__weapon-chip">
                      {weapon}: {count}
                    </span>
                  ),
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default VictoryOverlay;
