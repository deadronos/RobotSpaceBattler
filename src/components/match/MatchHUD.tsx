/**
 * MatchHUD Component — Match Status & Statistics Display (T021, US1)
 *
 * React component for displaying match HUD overlay with:
 * - Team scores and status
 * - Entity counts per team
 * - Match timer
 * - Victory/Draw/Timeout messages
 *
 * Input: MatchSimulationState from useMatchSimulation hook
 * Output: Full-screen HUD overlay
 */

import React, { useMemo } from 'react';

import type { MatchOutcome } from '../../systems/matchTrace/matchValidator';
import styles from './MatchHUD.module.css';

// ============================================================================
// Component Props
// ============================================================================

export interface MatchHUDProps {
  /** Current match time in milliseconds */
  timeMs: number;
  /** Array of entities (for counting alive by team) */
  entities: Array<{ id: string; teamId: string; isAlive: boolean; currentHealth?: number; maxHealth?: number }>;
  /** Current match outcome status */
  matchOutcome: MatchOutcome | null;
  /** Match result message (e.g., "Team 1 Wins!") */
  message?: string;
  /** Max match duration in milliseconds (for progress bar) */
  maxDurationMs?: number;
  /** Show/hide the HUD */
  visible?: boolean;
  /** Callback when HUD requests pause/resume */
  onPlayPauseToggle?: () => void;
}

// ============================================================================
// MatchHUD Component
// ============================================================================

export const MatchHUD: React.FC<MatchHUDProps> = ({
  timeMs,
  entities,
  matchOutcome,
  message,
  maxDurationMs = 60000,
  visible = true,
  onPlayPauseToggle,
}) => {
  // Calculate team stats
  const teamStats = useMemo(() => {
    const stats = new Map<string, { alive: number; total: number; totalHealth: number; maxHealth: number }>();

    entities.forEach((entity) => {
      if (!stats.has(entity.teamId)) {
        stats.set(entity.teamId, { alive: 0, total: 0, totalHealth: 0, maxHealth: 0 });
      }

      const teamStat = stats.get(entity.teamId)!;
      teamStat.total += 1;
      if (entity.isAlive) {
        teamStat.alive += 1;
        teamStat.totalHealth += entity.currentHealth || 0;
        teamStat.maxHealth += entity.maxHealth || 0;
      }
    });

    return Array.from(stats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [entities]);

  if (!visible) return null;

  // Calculate progress bar (time-based)
  const progress = Math.min(100, (timeMs / maxDurationMs) * 100);

  // Format time MM:SS.ms
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms_part = ms % 1000;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${Math.floor(ms_part / 10)
      .toString()
      .padStart(2, '0')}`;
  };

  return (
    <div className={styles.hudRoot}>
      {/* Top-left: Timer & Progress */}
      <div className={styles.timerSection}>
        <div className={styles.timeDisplay}>{formatTime(timeMs)}</div>
        <div className={styles.progressBar}>
          <div className={`${styles.progressFill} ${styles[`progress-${Math.round(progress / 10) * 10}`]}`} />
        </div>
      </div>

      {/* Top-right: Team Stats */}
      <div className={styles.teamStats}>
        {teamStats.map(([teamId, stats]) => {
          const healthPercent = stats.maxHealth > 0 ? (stats.totalHealth / stats.maxHealth) * 100 : 0;
          const healthLevel = Math.round(healthPercent / 10) * 10;

          return (
            <div key={teamId} className={styles.teamCard}>
              <div className={styles.teamName}>{teamId}</div>
              <div className={styles.teamCount}>
                {stats.alive} / {stats.total}
              </div>
              {stats.maxHealth > 0 && (
                <div className={styles.healthBar}>
                  <div className={`${styles.healthFill} ${styles[`health-${healthLevel}`]}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center: Match Status Message */}
      {message && (
        <div className={`${styles.statusMessage} ${styles[`status-${matchOutcome}`]}`}>{message}</div>
      )}

      {/* Bottom-left: Debug Info */}
      <div className={styles.debugInfo}>
        <div className={styles.debugItem}>Entities: {entities.length}</div>
        <div className={styles.debugItem}>Alive: {entities.filter((e) => e.isAlive).length}</div>
        <div className={styles.debugItem}>Status: {matchOutcome || 'in-progress'}</div>
      </div>

      {/* Bottom-center: Controls */}
      {onPlayPauseToggle && (
        <button className={styles.controlButton} onClick={onPlayPauseToggle}>
          Play / Pause
        </button>
      )}
    </div>
  );
};

MatchHUD.displayName = 'MatchHUD';
