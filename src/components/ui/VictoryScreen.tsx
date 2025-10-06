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
  const setStatsOpen = useUIStore((state) => state.setStatsOpen);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);

  if (!isVisible) {
    return null;
  }

  const pauseLabel = simulation.countdownPaused ? "Resume" : "Pause";

  const handlePauseClick = () => {
    const next = !simulation.countdownPaused;
    onTogglePause?.(next);
  };

  const handleResetClick = () => {
    onResetCountdown?.();
  };

  const handleStatsClick = () => {
    setStatsOpen(true);
    onShowStats?.();
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
    onShowSettings?.();
  };

  const snapshot = simulation.postBattleStats;
  const topRobotId = snapshot
    ? Object.entries(snapshot.perRobot).sort(
        ([, a], [, b]) => b.kills - a.kills,
      )[0]?.[0]
    : null;

  return (
    <section aria-label="Victory Screen" className="victory-screen">
      <header>
        <h2 className="victory-screen__title">
          {formatWinnerMessage(simulation.winner)}
        </h2>
        <p className="victory-screen__countdown">
          {formatCountdown(simulation.autoRestartCountdown)}
        </p>
      </header>

      <div className="victory-screen__actions">
        <button type="button" onClick={handlePauseClick}>
          {pauseLabel}
        </button>
        <button type="button" onClick={handleResetClick}>
          Reset Countdown
        </button>
        <button type="button" onClick={handleStatsClick}>
          Stats
        </button>
        <button type="button" onClick={handleSettingsClick}>
          Settings
        </button>
      </div>

      {snapshot && (
        <div
          aria-label="post-battle-summary"
          className="victory-screen__summary"
        >
          <strong className="victory-screen__summary-heading">
            Post-battle Summary
          </strong>
          <ul className="victory-screen__team-list">
            {Object.entries(snapshot.perTeam).map(([team, stats]) => (
              <li key={team}>
                Team {team}: {stats.totalKills} kills — {stats.totalDamageDealt}{" "}
                dmg
              </li>
            ))}
          </ul>
          {topRobotId && (
            <p className="victory-screen__top-performer">
              Top performer: {topRobotId}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export default VictoryScreen;
