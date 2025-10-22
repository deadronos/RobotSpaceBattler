/**
 * useMatchReplay Hook — Deterministic Replay Control
 *
 * Provides React interface for replay controls, seeking, and RNG validation.
 * Manages deterministic replay state and enables seeking to specific timestamps (T037, US3).
 *
 * Features:
 * - Pause/play/seek controls
 * - Playback rate adjustment
 * - RNG metadata validation
 * - Event timeline inspection
 */

import { useCallback, useMemo, useState } from "react";

import { MatchPlayer, ReplayMode } from "../systems/matchTrace/matchPlayer";
import { MatchTraceEvent } from "../systems/matchTrace/types";

// ============================================================================
// Hook Types
// ============================================================================

export interface ReplayControlsState {
  isPlaying: boolean;
  isPaused: boolean;
  isFinished: boolean;
  currentTimeMs: number;
  playbackRate: number;
  progress: number; // 0-1
  rngMode: ReplayMode;
  rngSeed?: number;
  rngAlgorithm?: string;
  rngValid: boolean;
  rngWarning?: string;
  currentEventCount: number;
  totalEventCount: number;
}

export interface ReplayActions {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (timestampMs: number) => void;
  seekToFrame: (frameIndex: number) => void;
  seekToProgress: (progress: number) => void;
  setPlaybackRate: (rate: number) => void;
  setReplayMode: (mode: ReplayMode) => void;
  resetRNG: () => void;
  stepForward: () => void; // For debug/manual stepping
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useMatchReplay — Manage deterministic replay of MatchTrace
 *
 * @param matchPlayer - MatchPlayer instance initialized with trace
 * @param onTimeChange - Optional callback when playback time changes
 * @returns {[state, actions]} Current replay state and control actions
 */
export function useMatchReplay(
  matchPlayer: MatchPlayer | null,
  onTimeChange?: (timeMs: number) => void,
): [ReplayControlsState, ReplayActions] {
  const [, setUpdateTrigger] = useState(0);

  // Get current RNG validation
  const rngValidation = useMemo(() => {
    if (!matchPlayer) return null;
    return matchPlayer.validateRNGMetadata();
  }, [matchPlayer]);

  // Build current state snapshot
  const state: ReplayControlsState = useMemo(() => {
    if (!matchPlayer) {
      return {
        isPlaying: false,
        isPaused: false,
        isFinished: false,
        currentTimeMs: 0,
        playbackRate: 1.0,
        progress: 0,
        rngMode: ReplayMode.Live,
        rngValid: false,
        currentEventCount: 0,
        totalEventCount: 0,
      };
    }

    const snapshot = matchPlayer.getSnapshot();
    const metadata = matchPlayer.getTraceMetadata();

    return {
      isPlaying: snapshot.state === "playing",
      isPaused: snapshot.state === "paused",
      isFinished: snapshot.state === "finished",
      currentTimeMs: snapshot.currentTimestampMs,
      playbackRate: matchPlayer.getPlaybackRate(),
      progress: snapshot.progress,
      rngMode: matchPlayer.getReplayMode(),
      rngSeed: metadata.rngSeed,
      rngAlgorithm: metadata.rngAlgorithm,
      rngValid: rngValidation?.valid ?? false,
      rngWarning: rngValidation?.warning,
      currentEventCount: snapshot.currentFrameIndex + 1,
      totalEventCount:
        snapshot.eventsAtTimestamp.length + snapshot.currentFrameIndex,
    };
  }, [matchPlayer, rngValidation]);

  // Trigger re-render on state change
  const forceUpdate = useCallback(() => {
    setUpdateTrigger((prev) => prev + 1);
  }, []);

  // Action creators
  const actions: ReplayActions = useMemo(
    () => ({
      play: () => {
        if (matchPlayer) {
          matchPlayer.play();
          forceUpdate();
          if (onTimeChange)
            onTimeChange(matchPlayer.getSnapshot().currentTimestampMs);
        }
      },

      pause: () => {
        if (matchPlayer) {
          matchPlayer.pause();
          forceUpdate();
        }
      },

      stop: () => {
        if (matchPlayer) {
          matchPlayer.stop();
          matchPlayer.resetRNG();
          forceUpdate();
          if (onTimeChange) onTimeChange(0);
        }
      },

      seek: (timestampMs: number) => {
        if (matchPlayer) {
          matchPlayer.seek(timestampMs);
          forceUpdate();
          if (onTimeChange) onTimeChange(timestampMs);
        }
      },

      seekToFrame: (frameIndex: number) => {
        if (matchPlayer) {
          // Find timestamp of frame at index
          const events = matchPlayer.getEventsBefore(Infinity);
          if (frameIndex >= 0 && frameIndex < events.length) {
            matchPlayer.seek(events[frameIndex].timestampMs);
            forceUpdate();
            if (onTimeChange) {
              onTimeChange(events[frameIndex].timestampMs);
            }
          }
        }
      },

      seekToProgress: (progress: number) => {
        if (matchPlayer) {
          const events = matchPlayer.getEventsBefore(Infinity);
          if (events.length === 0) return;

          const maxTime = events[events.length - 1].timestampMs;
          const targetTime = maxTime * Math.max(0, Math.min(1, progress));
          matchPlayer.seek(targetTime);
          forceUpdate();
          if (onTimeChange) onTimeChange(targetTime);
        }
      },

      setPlaybackRate: (rate: number) => {
        if (matchPlayer) {
          matchPlayer.setPlaybackRate(rate);
          forceUpdate();
        }
      },

      setReplayMode: (mode: ReplayMode) => {
        if (matchPlayer) {
          matchPlayer.setReplayMode(mode);
          matchPlayer.resetRNG();
          forceUpdate();
        }
      },

      resetRNG: () => {
        if (matchPlayer) {
          matchPlayer.resetRNG();
          forceUpdate();
        }
      },

      stepForward: () => {
        if (matchPlayer) {
          const snapshot = matchPlayer.getSnapshot();
          const events = matchPlayer.getEventsBefore(Infinity);
          if (
            snapshot.currentFrameIndex < events.length - 1 &&
            events.length > 0
          ) {
            const nextEvent = events[snapshot.currentFrameIndex + 1];
            matchPlayer.seek(nextEvent.timestampMs);
            forceUpdate();
            if (onTimeChange) onTimeChange(nextEvent.timestampMs);
          }
        }
      },
    }),
    [matchPlayer, forceUpdate, onTimeChange],
  );

  return [state, actions];
}

// ============================================================================
// Utility Hook for Event Inspection
// ============================================================================

/**
 * Hook to get events within a time range for inspection/debugging
 */
export function useMatchReplayEvents(
  matchPlayer: MatchPlayer | null,
  startTimeMs: number = 0,
  endTimeMs?: number,
): MatchTraceEvent[] {
  return useMemo(() => {
    if (!matchPlayer) return [];

    const allEvents = matchPlayer.getEventsBefore(
      endTimeMs ?? Number.POSITIVE_INFINITY,
    );
    return allEvents.filter((event) => event.timestampMs >= startTimeMs);
  }, [matchPlayer, startTimeMs, endTimeMs]);
}

/**
 * Hook to validate RNG metadata for reproducibility warnings
 */
export function useReplayRNGValidation(matchPlayer: MatchPlayer | null) {
  return useMemo(() => {
    if (!matchPlayer) return null;
    return matchPlayer.validateRNGMetadata();
  }, [matchPlayer]);
}
