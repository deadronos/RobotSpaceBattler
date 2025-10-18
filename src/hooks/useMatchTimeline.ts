/**
 * useMatchTimeline — React Hook for Match Timeline Management
 *
 * Encapsulates match playback state and frame stepping for React components.
 * Integrates MatchPlayer and interpolation logic into a reusable hook (T014, US1).
 *
 * Responsibilities:
 * - Manage MatchPlayer lifecycle (create, update, cleanup)
 * - Trigger frame steps on animation frame (game loop)
 * - Provide interpolated entity states to components
 * - Handle pause/play/seek controls
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { interpolateAllEntities } from '../systems/matchTrace/interpolator';
import { MatchPlayer, PlaybackState } from '../systems/matchTrace/matchPlayer';
import type { MatchTrace, MatchTraceEvent } from '../systems/matchTrace/types';

// ============================================================================
// Types
// ============================================================================

export interface UseMatchTimelineOptions {
  trace: MatchTrace;
  playbackRate?: number;
  autoPlay?: boolean;
  debugMode?: boolean;
  onFinished?: () => void;
}

export interface MatchTimelineState {
  currentTimestampMs: number;
  progress: number; // 0-1
  isPlaying: boolean;
  isFinished: boolean;
  frameIndex: number;
  eventsAtTimestamp: MatchTraceEvent[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMatchTimeline(options: UseMatchTimelineOptions): {
  state: MatchTimelineState;
  player: MatchPlayer | null;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (timestamp: number) => void;
  setPlaybackRate: (rate: number) => void;
} {
  const playerRef = useRef<MatchPlayer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const [state, setState] = useState<MatchTimelineState>(() => {
    const player = new MatchPlayer({
      trace: options.trace,
      playbackRate: options.playbackRate,
      autoPlay: options.autoPlay ?? false,
      debugMode: options.debugMode ?? false,
    });
    playerRef.current = player;
    const snapshot = player.getSnapshot();
    return {
      currentTimestampMs: snapshot.currentTimestampMs,
      progress: snapshot.progress,
      isPlaying: player.getState() === PlaybackState.Playing,
      isFinished: player.isFinished(),
      frameIndex: snapshot.currentFrameIndex,
      eventsAtTimestamp: snapshot.eventsAtTimestamp,
    };
  });

  // Game loop: step player on animation frame
  useEffect(() => {
    if (!playerRef.current) return;

    const animate = (currentTime: number) => {
      const player = playerRef.current!;

      // Skip first frame (initialize time)
      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = currentTime;
      } else {
        const deltaMs = currentTime - lastFrameTimeRef.current;
        lastFrameTimeRef.current = currentTime;

        // Step the player
        player.step(deltaMs);

        // Update state
        const snapshot = player.getSnapshot();
        setState({
          currentTimestampMs: snapshot.currentTimestampMs,
          progress: snapshot.progress,
          isPlaying: player.getState() === PlaybackState.Playing,
          isFinished: player.isFinished(),
          frameIndex: snapshot.currentFrameIndex,
          eventsAtTimestamp: snapshot.eventsAtTimestamp,
        });

        // Call finished callback if match ended
        if (player.isFinished() && options.onFinished) {
          options.onFinished();
        }
      }

      // Schedule next frame
      if (player.getState() === PlaybackState.Playing) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    };

    // Only request animation frame if playing
    if (playerRef.current.getState() === PlaybackState.Playing) {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      lastFrameTimeRef.current = 0;
    };
  }, [options]);

  // Playback controls
  const play = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
      lastFrameTimeRef.current = performance.now();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      const snapshot = playerRef.current.getSnapshot();
      setState({
        currentTimestampMs: snapshot.currentTimestampMs,
        progress: snapshot.progress,
        isPlaying: false,
        isFinished: false,
        frameIndex: snapshot.currentFrameIndex,
        eventsAtTimestamp: snapshot.eventsAtTimestamp,
      });
    }
  }, []);

  const seek = useCallback((timestamp: number) => {
    if (playerRef.current) {
      playerRef.current.seek(timestamp);
      const snapshot = playerRef.current.getSnapshot();
      setState({
        currentTimestampMs: snapshot.currentTimestampMs,
        progress: snapshot.progress,
        isPlaying: playerRef.current.getState() === PlaybackState.Playing,
        isFinished: playerRef.current.isFinished(),
        frameIndex: snapshot.currentFrameIndex,
        eventsAtTimestamp: snapshot.eventsAtTimestamp,
      });
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate);
    }
  }, []);

  return {
    state,
    player: playerRef.current,
    play,
    pause,
    stop,
    seek,
    setPlaybackRate,
  };
}

/**
 * Hook to compute interpolated entity positions at current timeline timestamp.
 *
 * @param trace - MatchTrace data
 * @param currentTimestamp - Current playback timestamp (ms)
 * @param entityIds - Optional list of entity IDs to interpolate
 * @returns Map of entityId -> InterpolatedEntity
 */
export function useInterpolatedEntities(
  trace: MatchTrace,
  currentTimestamp: number,
  entityIds?: string[],
) {
  return useState(() => {
    const eventsBefore = trace.events.filter((e) => e.timestampMs <= currentTimestamp);
    return interpolateAllEntities(trace.events, eventsBefore, currentTimestamp, entityIds);
  })[0];
}
