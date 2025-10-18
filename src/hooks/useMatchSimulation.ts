/**
 * useMatchSimulation Hook — Match Orchestrator (T023, US1)
 *
 * Central orchestration hook that ties together:
 * - MatchPlayer (playback engine)
 * - EntityMapper (event→state conversion)
 * - Interpolator (smooth positions)
 * - Match validator (victory detection)
 *
 * Provides React integration for a complete match lifecycle:
 * Play → Entity updates → Victory detection → Result callback
 *
 * Used by Scene.tsx to render automated matches in 3D view.
 */

import { useEffect, useRef, useState } from 'react';

import type { EntityState } from '../systems/matchTrace/entityMapper';
import { EntityMapper } from '../systems/matchTrace/entityMapper';
import { MatchPlayer, ReplayMode } from '../systems/matchTrace/matchPlayer';
import {
  isTerminal,
  MatchOutcome,
  validateMatchOutcome,
} from '../systems/matchTrace/matchValidator';
import type { MatchTrace } from '../systems/matchTrace/types';

// ============================================================================
// Hook Configuration & State
// ============================================================================

export interface UseMatchSimulationConfig {
  trace: MatchTrace;
  autoPlay?: boolean;
  playbackRate?: number;
  debugMode?: boolean;
  maxDurationMs?: number; // Timeout after this duration
  replayMode?: ReplayMode; // T039: Add replay mode support for deterministic replay
  onVictory?: (winnerId: string, survivors: EntityState[]) => void;
  onDraw?: () => void;
  onTimeout?: () => void;
  onMatchEnd?: (outcome: MatchOutcome, details: string) => void;
}

export interface MatchSimulationState {
  // Playback state
  isPlaying: boolean;
  isFinished: boolean;
  progress: number; // 0–1
  currentTimestampMs: number;

  // Entity state
  entities: EntityState[];
  aliveEntities: EntityState[];

  // Match state
  matchOutcome: MatchOutcome;
  winnerId?: string;
  matchMessage: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useMatchSimulation(config: UseMatchSimulationConfig): MatchSimulationState {
  const {
    trace,
    autoPlay = false,
    playbackRate = 1.0,
    debugMode = false,
    maxDurationMs = 60000, // 60s default timeout
    replayMode = ReplayMode.Live, // T039: Default to live mode
    onVictory,
    onDraw,
    onTimeout,
    onMatchEnd,
  } = config;

  // Persistent references (not reinitialized on render)
  const playerRef = useRef<MatchPlayer | null>(null);
  const mapperRef = useRef<EntityMapper | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const lastOutcomeRef = useRef<MatchOutcome>(MatchOutcome.InProgress);
  const callbacksFiredRef = useRef<Set<MatchOutcome>>(new Set());

  // React state (triggers renders)
  const [state, setState] = useState<MatchSimulationState>(() => {
    return {
      isPlaying: autoPlay,
      isFinished: false,
      progress: 0,
      currentTimestampMs: 0,
      entities: [],
      aliveEntities: [],
      matchOutcome: MatchOutcome.InProgress,
      matchMessage: 'Match starting...',
    };
  });

  // Initialize player and mapper on mount or trace change
  useEffect(() => {
    playerRef.current = new MatchPlayer({
      trace,
      playbackRate,
      debugMode,
      autoPlay: false, // We control playback via state
      replayMode, // T039: Pass replay mode to MatchPlayer
    });

    mapperRef.current = new EntityMapper();
    lastTimeRef.current = performance.now();
    lastOutcomeRef.current = MatchOutcome.InProgress;
    callbacksFiredRef.current.clear();

    // Auto-start if requested
    if (autoPlay && playerRef.current) {
      playerRef.current.play();
      setState((prev) => ({ ...prev, isPlaying: true }));
    }

    return () => {
      playerRef.current = null;
      mapperRef.current = null;
    };
  }, [trace, debugMode, autoPlay, playbackRate, replayMode]); // T039: Add replayMode to deps

  // Main animation frame loop
  useEffect(() => {
    if (!playerRef.current || !mapperRef.current || !state.isPlaying) {
      return;
    }

    const player = playerRef.current;
    const mapper = mapperRef.current;

    let frameId: number;

    const loop = () => {
      const now = performance.now();
      const deltaMs = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Step playback
      player.step(deltaMs);
      const snapshot = player.getSnapshot();

      // Update entity state from events
      mapper.updateFromEvents(trace.events, snapshot.currentTimestampMs, snapshot.currentFrameIndex);

      // Note: interpolateAllEntities used for future frame interpolation feature
      // For now, we use EntityMapper state which is sufficient for victory detection
      const entities: EntityState[] = [];
      const aliveEntities: EntityState[] = [];

      for (const entity of mapper.getAllEntities()) {
        entities.push(entity);
        if (entity.isAlive) {
          aliveEntities.push(entity);
        }
      }

      // Check match outcome
      const result = validateMatchOutcome(aliveEntities, maxDurationMs, snapshot.currentTimestampMs);
      const outcomeChanged = lastOutcomeRef.current !== result.outcome;

      // Fire callbacks on outcome change
      if (outcomeChanged && !callbacksFiredRef.current.has(result.outcome)) {
        callbacksFiredRef.current.add(result.outcome);

        if (result.outcome === MatchOutcome.Victory && onVictory && result.winnerId) {
          onVictory(result.winnerId, result.survivors || []);
        }

        if (result.outcome === MatchOutcome.Draw && onDraw) {
          onDraw();
        }

        if (result.outcome === MatchOutcome.Timeout && onTimeout) {
          onTimeout();
        }

        if (onMatchEnd && isTerminal(result.outcome)) {
          onMatchEnd(result.outcome, result.reason || '');
        }
      }

      lastOutcomeRef.current = result.outcome;

      // Update React state
      setState({
        isPlaying: snapshot.state !== 'finished',
        isFinished: snapshot.state === 'finished',
        progress: snapshot.progress,
        currentTimestampMs: snapshot.currentTimestampMs,
        entities,
        aliveEntities,
        matchOutcome: result.outcome,
        winnerId: result.winnerId,
        matchMessage: result.reason || '',
      });

      // Continue loop if match is playing
      if (snapshot.state !== 'finished') {
        frameId = requestAnimationFrame(loop);
      }
    };

    frameId = requestAnimationFrame(loop);

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [state.isPlaying, trace, maxDurationMs, onVictory, onDraw, onTimeout, onMatchEnd]);

  return state;
}
