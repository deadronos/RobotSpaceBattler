import "./VictoryScreen.css";

import type { SimulationState } from "../../ecs/entities/SimulationState";
import { useUIStore } from "../../store/uiStore";

export interface VictoryScreenProps {
  simulation: Pick<
    SimulationState,
    "status" | "winner" | "autoRestartCountdown" | "countdownPaused"
  > & { postBattleStats?: SimulationState["postBattleStats"] };
  onTogglePause?: (paused: boolean) => void;
  onResetCountdown?: () => void;
  onShowStats?: () => void;
  onShowSettings?: () => void;
}

function formatWinnerMessage(
  winner: VictoryScreenProps["simulation"]["winner"],
): string {
  if (winner === "draw" || winner === null) {
    return "Battle Ends in a Draw";
  }

  return winner === "red" ? "Red Team Wins" : "Blue Team Wins";
}

function formatCountdown(countdown: number | null): string {
  if (countdown === null) {
    return "Auto-restart pending";
  }

  const seconds = Math.max(0, Math.ceil(countdown));
  return `Auto-restart in ${seconds}s`;
}

export function VictoryScreen({
  simulation,
  onTogglePause,
  onResetCountdown,
  onShowStats,
  onShowSettings,
}: VictoryScreenProps) {
  const isVisible =
    simulation.status === "victory" ||
    simulation.status === "simultaneous-elimination";

  const openStats = useUIStore((s) => s.openStats);
  const openSettings = useUIStore((s) => s.openSettings);

  function handlePause() {
    if (onTogglePause) onTogglePause(true);
  }

  function handleOpenStats() {
    if (onShowStats) onShowStats();
    openStats();
  }

  function handleOpenSettings() {
    if (onShowSettings) onShowSettings();
    openSettings();
  }

  function handleResetCountdown() {
    if (onResetCountdown) {
      onResetCountdown();
    }
  }

  if (!isVisible) return null;

  const countdownText = formatCountdown(
    simulation.autoRestartCountdown ?? null,
  );

  // compute top performer if postBattleStats present
  let topPerformer: string | null = null;
  if (simulation.postBattleStats?.perRobot) {
    const entries = Object.entries(simulation.postBattleStats.perRobot);
    if (entries.length > 0) {
      entries.sort((a, b) => (b[1].kills ?? 0) - (a[1].kills ?? 0));
      topPerformer = entries[0][0];
    }
  }

  return (
    <div className="victory-overlay" role="region" aria-label="Victory Overlay">
      <h1>{formatWinnerMessage(simulation.winner)}</h1>
      <p>{countdownText}</p>

      <div>
        <button onClick={handlePause} aria-label="Pause">
          Pause
        </button>
        <button onClick={handleResetCountdown} aria-label="Reset Countdown">
          Reset
        </button>
        <button onClick={handleOpenStats} aria-label="Stats">
          Stats
        </button>
        <button onClick={handleOpenSettings} aria-label="Settings">
          Settings
        </button>
      </div>

      {simulation.postBattleStats && (
        <section aria-label="post-battle-summary">
          <h2>Post-battle Summary</h2>
          {/* team summary minimal rendering for tests */}
          {Object.entries(simulation.postBattleStats.perTeam ?? {}).map(
            ([teamId, team]) => (
              <p key={teamId}>
                Team {teamId}: {team.totalKills} kills
              </p>
            ),
          )}
          {topPerformer && <p>Top performer: {topPerformer}</p>}
        </section>
      )}
    </div>
  );
}

export default VictoryScreen;
