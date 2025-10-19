/**
 * BetweenRoundsUI Component — Post-Match Flow & Rematch/Export (T053, US3)
 *
 * Displays after match victory:
 * - Winner summary
 * - Team/robot statistics
 * - Rematch button (new RNG seed)
 * - Team selection (optional)
 * - Export trace button (JSON download)
 */

import React, { useCallback } from "react";

import type { MatchTrace } from "../../systems/matchTrace/types";
import styles from "./BetweenRoundsUI.module.css";

export interface BetweenRoundsUIProps {
  /** Match result: winning team ID or "draw" */
  winner: string | "draw" | null;

  /** Match trace for stats and export */
  matchTrace: MatchTrace;

  /** Array of robots with final stats */
  robotStats: Array<{
    id: string;
    teamId: string;
    kills: number;
    deaths: number;
    damageDealt: number;
    damageTaken: number;
    finalHealth: number;
    maxHealth: number;
  }>;

  /** Team aggregate stats */
  teamStats: Record<
    string,
    {
      totalKills: number;
      totalDeaths: number;
      totalDamageDealt: number;
    }
  >;

  /** Callback when user clicks Rematch (passes new seed) */
  onRematch?: (newSeed: number) => void;

  /** Callback when user clicks Export (receives trace as JSON) */
  onExportTrace?: (traceJson: string) => void;

  /** Show/hide the UI */
  visible?: boolean;
}

export const BetweenRoundsUI: React.FC<BetweenRoundsUIProps> = ({
  winner,
  matchTrace,
  robotStats,
  teamStats,
  onRematch,
  onExportTrace,
  visible = true,
}) => {
  const handleRematch = useCallback(() => {
    // Generate new seed for next match
    const newSeed = Math.floor(Math.random() * 0xffffffff);
    onRematch?.(newSeed);
  }, [onRematch]);

  const handleExportTrace = useCallback(() => {
    const traceJson = JSON.stringify(matchTrace, null, 2);

    if (onExportTrace) {
      onExportTrace(traceJson);
    }

    // Trigger browser download
    const blob = new Blob([traceJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `match-trace-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [matchTrace, onExportTrace]);

  if (!visible) {
    return null;
  }

  const winnerLabel =
    winner === "draw"
      ? "Battle Ended in a Draw"
      : winner
        ? `${winner} Team Wins!`
        : "Match Complete";

  const topRobot = robotStats.reduce((best, current) => {
    const bestScore = best.kills - best.deaths;
    const currentScore = current.kills - current.deaths;
    return currentScore > bestScore ? current : best;
  }, robotStats[0]);

  return (
    <div className={styles.betweenRoundsContainer} role="region" aria-label="Post-match summary">
      {/* Winner Banner */}
      <div className={styles.winnerBanner}>
        <h1 className={styles.winnerTitle}>{winnerLabel}</h1>
      </div>

      {/* Team Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.teamsSection}>
          <h2>Team Performance</h2>
          <div className={styles.teamsList}>
            {Object.entries(teamStats).map(([teamId, stats]) => (
              <div key={teamId} className={styles.teamStatCard}>
                <h3>{teamId}</h3>
                <dl className={styles.statsList}>
                  <dt>Kills:</dt>
                  <dd>{stats.totalKills}</dd>
                  <dt>Deaths:</dt>
                  <dd>{stats.totalDeaths}</dd>
                  <dt>Damage Dealt:</dt>
                  <dd>{Math.round(stats.totalDamageDealt)}</dd>
                </dl>
              </div>
            ))}
          </div>
        </div>

        {/* Robot Rankings */}
        <div className={styles.robotsSection}>
          <h2>Robot Rankings</h2>
          <div className={styles.robotsList}>
            {robotStats
              .sort((a, b) => {
                // Sort by K/D ratio
                const aKD = a.kills - a.deaths;
                const bKD = b.kills - b.deaths;
                return bKD - aKD;
              })
              .map((robot, idx) => (
                <div
                  key={robot.id}
                  className={`${styles.robotStatRow} ${idx === 0 ? styles.topPerformer : ""}`}
                >
                  <span className={styles.rank}>#{idx + 1}</span>
                  <span className={styles.robotId}>{robot.id}</span>
                  <span className={styles.teamBadge}>{robot.teamId}</span>
                  <span className={styles.stat}>{robot.kills}K</span>
                  <span className={styles.stat}>{robot.deaths}D</span>
                  <span className={styles.stat}>
                    {Math.round(robot.damageDealt)} DMG
                  </span>
                </div>
              ))}
          </div>

          {topRobot && (
            <div className={styles.topPerformerBanner}>
              <p>
                <strong>Top Performer:</strong> {topRobot.id} ({topRobot.kills}
                K / {topRobot.deaths}D)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtons}>
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          onClick={handleRematch}
          aria-label="Start new match with random seed"
        >
          🔄 Rematch
        </button>

        <button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={handleExportTrace}
          aria-label="Export match trace as JSON"
        >
          ⬇️ Export Trace
        </button>
      </div>

      {/* Optional: Team Selection Card */}
      <div className={styles.nextMatchPreview}>
        <h2>Ready for Next Battle</h2>
        <p>Select teams and click Rematch to begin a new match!</p>
      </div>
    </div>
  );
};

BetweenRoundsUI.displayName = "BetweenRoundsUI";

export default BetweenRoundsUI;
