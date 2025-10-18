/**
 * ReplayControls Component — UI for Deterministic Replay
 *
 * Provides controls for playback: play/pause, seek, playback rate, RNG validation
 * warnings, and replay mode toggle (T038, US3).
 *
 * Features:
 * - Play/Pause/Stop buttons
 * - Timeline seek bar
 * - Playback rate control
 * - RNG validation status display
 * - Replay mode toggle (Live vs Deterministic)
 */

import React, { useMemo } from 'react';

import { useMatchReplay } from '../../hooks/useMatchReplay';
import { MatchPlayer, ReplayMode } from '../../systems/matchTrace/matchPlayer';

// ============================================================================
// Component Props
// ============================================================================

export interface ReplayControlsProps {
  matchPlayer: MatchPlayer | null;
  className?: string;
  onTimeChange?: (timeMs: number) => void;
  showRNGStatus?: boolean;
  showReplayMode?: boolean;
}

// ============================================================================
// ReplayControls Component
// ============================================================================

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  matchPlayer,
  className = '',
  onTimeChange,
  showRNGStatus = true,
  showReplayMode = true,
}) => {
  const [state, actions] = useMatchReplay(matchPlayer, onTimeChange);

  // Format time for display
  const formatTime = (ms: number): string => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  // Get playback rate options
  const rateOptions = useMemo(() => [0.5, 1, 1.5, 2, 4], []);

  if (!matchPlayer) {
    return (
      <div className={`replay-controls replay-controls--empty ${className}`}>
        <p className="replay-controls__empty-message">No match loaded</p>
      </div>
    );
  }

  return (
    <div className={`replay-controls ${className}`}>
      {/* Playback Controls */}
      <div className="replay-controls__playback">
        <button
          className="replay-controls__button replay-controls__button--stop"
          onClick={actions.stop}
          title="Stop and reset"
          type="button"
        >
          ⏹ Stop
        </button>

        {state.isPlaying ? (
          <button
            className="replay-controls__button replay-controls__button--pause"
            onClick={actions.pause}
            title="Pause playback"
            type="button"
          >
            ⏸ Pause
          </button>
        ) : (
          <button
            className="replay-controls__button replay-controls__button--play"
            onClick={actions.play}
            title="Play"
            disabled={state.isFinished}
            type="button"
          >
            ▶ Play
          </button>
        )}

        <div className="replay-controls__time">
          <span className="replay-controls__time-current">{formatTime(state.currentTimeMs)}</span>
          <span className="replay-controls__time-separator">/</span>
          <span className="replay-controls__time-end">
            {formatTime(
              (matchPlayer.getEventsBefore(Number.POSITIVE_INFINITY).at(-1)?.timestampMs) ??
                0,
            )}
          </span>
        </div>
      </div>

      {/* Timeline Seek Bar */}
      <div className="replay-controls__timeline">
        <input
          type="range"
          min="0"
          max="100"
          value={state.progress * 100}
          onChange={(e) => actions.seekToProgress(parseFloat(e.target.value) / 100)}
          className="replay-controls__seek-bar"
          title="Seek to position in match"
        />
      </div>

      {/* Playback Rate */}
      <div className="replay-controls__rate">
        <label htmlFor="replay-rate" className="replay-controls__rate-label">
          Speed:
        </label>
        <select
          id="replay-rate"
          value={state.playbackRate}
          onChange={(e) => actions.setPlaybackRate(parseFloat(e.target.value))}
          className="replay-controls__rate-select"
        >
          {rateOptions.map((rate) => (
            <option key={rate} value={rate}>
              {rate}x
            </option>
          ))}
        </select>
      </div>

      {/* Replay Mode Toggle */}
      {showReplayMode && (
        <div className="replay-controls__mode">
          <fieldset className="replay-controls__mode-fieldset">
            <legend className="replay-controls__mode-legend">Replay Mode:</legend>
            <div className="replay-controls__mode-buttons">
              <button
                className={`replay-controls__mode-button ${state.rngMode === ReplayMode.Live ? 'replay-controls__mode-button--active' : ''}`}
                onClick={() => actions.setReplayMode(ReplayMode.Live)}
                title="Live mode: normal playback"
                type="button"
              >
                Live
              </button>
              <button
                className={`replay-controls__mode-button ${state.rngMode === ReplayMode.Deterministic ? 'replay-controls__mode-button--active' : ''}`}
                onClick={() => actions.setReplayMode(ReplayMode.Deterministic)}
                title="Deterministic mode: replays with RNG seed for reproducibility"
                type="button"
              >
                Deterministic
              </button>
            </div>
          </fieldset>
        </div>
      )}

      {/* RNG Status */}
      {showRNGStatus && state.rngMode === ReplayMode.Deterministic && (
        <div className={`replay-controls__rng-status replay-controls__rng-status--${state.rngValid ? 'valid' : 'warning'}`}>
          <div className="replay-controls__rng-header">
            <span className="replay-controls__rng-icon">
              {state.rngValid ? '✓' : '⚠'}
            </span>
            <span className="replay-controls__rng-title">RNG Status</span>
          </div>
          <div className="replay-controls__rng-details">
            {state.rngSeed && (
              <div className="replay-controls__rng-item">
                <span className="replay-controls__rng-label">Seed:</span>
                <code className="replay-controls__rng-value">{state.rngSeed}</code>
              </div>
            )}
            {state.rngAlgorithm && (
              <div className="replay-controls__rng-item">
                <span className="replay-controls__rng-label">Algorithm:</span>
                <code className="replay-controls__rng-value">{state.rngAlgorithm}</code>
              </div>
            )}
            {state.rngWarning && (
              <div className="replay-controls__rng-warning">{state.rngWarning}</div>
            )}
          </div>
        </div>
      )}

      {/* Event Counter */}
      <div className="replay-controls__events">
        <span className="replay-controls__events-label">Events:</span>
        <span className="replay-controls__events-value">
          {state.currentEventCount} / {state.totalEventCount}
        </span>
      </div>
    </div>
  );
};

ReplayControls.displayName = 'ReplayControls';
