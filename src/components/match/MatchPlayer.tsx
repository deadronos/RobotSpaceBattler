/**
 * MatchPlayer Component — Match Trace Playback UI
 *
 * React component that orchestrates MatchTrace playback with entity rendering,
 * interpolation, and match state visualization (T018, US1).
 *
 * Responsibilities:
 * - Integrate useMatchTimeline hook for playback control
 * - Render entities at interpolated positions
 * - Display match status (in-progress, finished, winner)
 * - Provide debug visualization
 */

import React, { useMemo } from "react";

import { useMatchTimeline } from "../../hooks/useMatchTimeline";
import { EntityMapper } from "../../systems/matchTrace/entityMapper";
import type { MatchTrace } from "../../systems/matchTrace/types";
import styles from "./MatchPlayer.module.css";

// ============================================================================
// Component Props
// ============================================================================

export interface MatchPlayerProps {
  trace: MatchTrace;
  autoPlay?: boolean;
  playbackRate?: number;
  debugMode?: boolean;
  onFinished?: () => void;
  renderEntity?: (
    id: string,
    position: { x: number; y: number; z: number },
  ) => React.ReactNode;
}

// ============================================================================
// Component Implementation
// ============================================================================

export const MatchPlayer: React.FC<MatchPlayerProps> = ({
  trace,
  autoPlay = false,
  playbackRate = 1.0,
  debugMode = false,
  onFinished,
  renderEntity,
}) => {
  const { state, player, play, pause, stop, seek } = useMatchTimeline({
    trace,
    autoPlay,
    playbackRate,
    debugMode,
    onFinished,
  });

  // Build entity states
  const entityMapper = useMemo(() => {
    const mapper = new EntityMapper();
    mapper.updateFromEvents(
      trace.events,
      state.currentTimestampMs,
      state.frameIndex,
    );
    return mapper;
  }, [trace.events, state.currentTimestampMs, state.frameIndex]);

  const visibleEntities = useMemo(
    () => entityMapper.getAliveEntities(),
    [entityMapper],
  );

  // Determine match winner (if finished)
  const matchResult = useMemo(() => {
    if (!state.isFinished) {
      return null;
    }

    // Scan all teams to find which has units still alive
    const teamsWithAliveUnits = new Map<string, number>();
    for (const entity of visibleEntities) {
      const count = teamsWithAliveUnits.get(entity.teamId) || 0;
      teamsWithAliveUnits.set(entity.teamId, count + 1);
    }

    // If only one team has units, they won
    const aliveTeams = Array.from(teamsWithAliveUnits.entries()).filter(
      (e) => e[1] > 0,
    );
    if (aliveTeams.length === 1) {
      return {
        winner: aliveTeams[0][0],
        status: "victory",
      };
    }

    return {
      status: "draw",
    };
  }, [state.isFinished, visibleEntities]);

  const maxTimestamp = Math.max(...trace.events.map((e) => e.timestampMs), 1);
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTs = (parseFloat(e.target.value) / 100) * maxTimestamp;
    seek(newTs);
  };

  return (
    <div className={styles.container}>
      {/* Match Status */}
      <div className={styles.status}>
        <p className={styles.statusText}>
          <strong>Match Status:</strong>{" "}
          {state.isFinished
            ? `Finished (${matchResult?.winner ? `Winner: ${matchResult.winner}` : "Draw"})`
            : "In Progress"}
        </p>
        <p className={styles.statusText}>
          <strong>Time:</strong> {state.currentTimestampMs.toFixed(0)}ms /{" "}
          {maxTimestamp.toFixed(0)}
          ms
        </p>
        <p className={styles.statusText}>
          <strong>Entities:</strong> {visibleEntities.length} alive
        </p>
        {debugMode && player && (
          <p className={styles.statusDebug}>{player.getDebugInfo()}</p>
        )}
      </div>

      {/* Timeline Scrubber */}
      <div className={styles.timeline}>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(state.progress * 100)}
          onChange={handleSeek}
          className={styles.timelineInput}
          title="Timeline scrubber"
        />
        <span>{(state.progress * 100).toFixed(1)}%</span>
      </div>

      {/* Playback Controls */}
      <div className={styles.controls}>
        <button onClick={play} disabled={state.isPlaying || state.isFinished}>
          Play
        </button>
        <button onClick={pause} disabled={!state.isPlaying}>
          Pause
        </button>
        <button onClick={stop}>Stop</button>
      </div>

      {/* Entity Visualization */}
      <div className={styles.visualization}>
        {visibleEntities.length > 0 ? (
          <div className={styles.entities}>
            {visibleEntities.map((entity) => (
              <div key={entity.id} className={styles.entity}>
                <div className={styles.entityId}>{entity.id}</div>
                <div className={styles.entityInfo}>
                  Position: ({entity.position.x.toFixed(2)},{" "}
                  {entity.position.y.toFixed(2)}, {entity.position.z.toFixed(2)}
                  )
                </div>
                <div className={styles.entityInfo}>
                  Team: {entity.teamId} | Health:{" "}
                  {entity.currentHealth ?? "unknown"}/
                  {entity.maxHealth ?? "unknown"}
                </div>
                {renderEntity && renderEntity(entity.id, entity.position)}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noEntities}>No visible entities</div>
        )}
      </div>

      {/* Match Result */}
      {matchResult && (
        <div
          className={`${styles.result} ${
            matchResult.status === "victory"
              ? styles.resultVictory
              : styles.resultDraw
          }`}
        >
          {matchResult.status === "victory"
            ? `🎉 Team ${matchResult.winner} Wins!`
            : "🤝 Match Ended in a Draw"}
        </div>
      )}
    </div>
  );
};

MatchPlayer.displayName = "MatchPlayer";
