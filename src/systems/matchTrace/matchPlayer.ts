/**
 * Match Player — Trace Playback Engine
 *
 * Orchestrates deterministic replay of MatchTrace events with frame-stepping
 * and interpolation. Central hub for match timeline synchronization (T011, US1).
 *
 * Responsibilities:
 * - Load and validate MatchTrace from recording
 * - Maintain playback state (currentTime, frameIndex, playbackRate)
 * - Step through events frame-by-frame with RNG seeding
 * - Provide snapshot of entity state at any timestamp
 * - Debug mode: frame-step mode with event inspection
 */

import { RNG_ALGORITHM_ID, RNGManager } from "./rngManager";
import { EventIndex } from "./eventIndex";
import {
  PlaybackClock,
  PlaybackState,
} from "./playbackClock";
import { MatchTrace, MatchTraceEvent } from "./types";

// ============================================================================
// Types & Constants
// ============================================================================

export { PlaybackState }; // Re-export for public API

export enum ReplayMode {
  Live = "live", // Normal trace playback without RNG seeding
  Deterministic = "deterministic", // Replay with RNG seed for exact reproduction
}

export interface MatchPlayerConfig {
  trace: MatchTrace;
  playbackRate?: number; // 1.0 = real-time, 2.0 = 2x speed
  autoPlay?: boolean;
  debugMode?: boolean; // frame-step mode
  rngSeed?: number;
  replayMode?: ReplayMode; // T036: Add replay mode support
}

export interface PlaybackSnapshot {
  currentTimestampMs: number;
  currentFrameIndex: number;
  eventsAtTimestamp: MatchTraceEvent[];
  state: PlaybackState;
  progress: number; // 0-1
}

// ============================================================================
// MatchPlayer Class
// ============================================================================

export class MatchPlayer {
  private trace: MatchTrace;
  private debugMode: boolean = false;
  private rngSeed: number;
  private replayMode: ReplayMode = ReplayMode.Live;
  private rngManager: RNGManager | null = null; // T036: RNG manager for deterministic replay

  // Extracted components (T063)
  private eventIndex: EventIndex;
  private clock: PlaybackClock;

  // Public state properties (exposed for backward compatibility & API access)
  public currentTimestampMs: number = 0;
  public currentFrameIndex: number = 0;
  public state: PlaybackState = PlaybackState.Idle;
  private playbackRate: number = 1.0;

  constructor(config: MatchPlayerConfig) {
    this.trace = config.trace;
    this.debugMode = config.debugMode ?? false;
    this.rngSeed = config.rngSeed ?? this.trace.rngSeed ?? 0;
    this.replayMode = config.replayMode ?? ReplayMode.Live;

    // Build event index using EventIndex class (T063)
    this.eventIndex = new EventIndex(this.trace.events);

    // Initialize playback clock (T063)
    const maxTs = this.eventIndex.getMaxTimestamp();
    const maxFrames = this.eventIndex.getEventCount();
    this.clock = new PlaybackClock(maxTs, maxFrames);
    if (config.playbackRate) {
      this.clock.setPlaybackRate(config.playbackRate);
    }

    // Initialize RNG manager if in deterministic replay mode (T036)
    if (this.replayMode === ReplayMode.Deterministic) {
      this.initializeRNG();
    }

    // Auto-play if requested
    if (config.autoPlay) {
      this.play();
    }
  }

  /**
   * Get events at the exact current timestamp (for triggering events).
   * (T063: delegated to EventIndex)
   */
  private getEventsAtTimestamp(ts: number): MatchTraceEvent[] { return this.eventIndex.getEventsAtTimestamp(ts); }

  /**
   * Find frame (event index) that corresponds to a timestamp.
   * (T063: delegated to EventIndex)
   */
  private findFrameIndexAtTimestamp(ts: number): number { return this.eventIndex.findFrameIndexAtTimestamp(ts); }

  /**
   * Get maximum timestamp in trace.
   * (T063: delegated to EventIndex)
   */
  private getMaxTimestamp(): number { return this.eventIndex.getMaxTimestamp(); }

  /**
   * Sync internal state from clock after any clock operation.
   * Private helper to reduce duplication across play/pause/step/seek operations.
   */
  private syncStateFromClock(): void {
    this.currentTimestampMs = this.clock.getCurrentTimestamp();
    this.currentFrameIndex = this.findFrameIndexAtTimestamp(this.currentTimestampMs);
    this.state = this.clock.getState();
  }

  /**
   * Start playback from current position.
   */
  public play(): void {
    this.clock.play();
    this.state = this.clock.getState();
  }

  /**
   * Pause playback.
   */
  public pause(): void {
    this.clock.pause();
    this.state = this.clock.getState();
  }

  /**
   * Stop and reset to beginning.
   */
  public stop(): void {
    this.clock.stop();
    this.syncStateFromClock();
  }

  /**
   * Advance playback by delta time and update frame index.
   */
  public step(deltaMs: number): void {
    this.clock.advance(deltaMs);
    this.syncStateFromClock();
  }

  /**
   * Seek to a specific timestamp.
   */
  public seek(targetTimestampMs: number): void {
    this.clock.seek(targetTimestampMs);
    this.syncStateFromClock();
  }

  /**
   * Manually advance one frame (debug mode).
   */
  public stepFrame(maxFrames: number = 1): void {
    this.clock.stepFrame(maxFrames);
    this.syncStateFromClock();
  }

  /**
   * Get current playback snapshot.
   */
  public getSnapshot(): PlaybackSnapshot {
    const eventsAtTimestamp = this.getEventsAtTimestamp(
      this.currentTimestampMs,
    );
    const maxTs = this.getMaxTimestamp();
    const progress = maxTs > 0 ? this.currentTimestampMs / maxTs : 0;

    return {
      currentTimestampMs: this.currentTimestampMs,
      currentFrameIndex: this.currentFrameIndex,
      eventsAtTimestamp,
      state: this.state,
      progress,
    };
  }

  /**
   * Get all events at or before a given timestamp.
   * (T063: delegated to EventIndex)
   */
  public getEventsBefore(timestampMs: number): MatchTraceEvent[] {
    return this.eventIndex.getEventsBefore(timestampMs);
  }

  // ========================================================================
  // Configuration Getters/Setters
  // ========================================================================

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, rate);
    this.clock.setPlaybackRate(this.playbackRate);
  }

  public getPlaybackRate(): number { return this.clock.getPlaybackRate(); }
  public getRNGSeed(): number { return this.rngSeed; }
  public getState(): PlaybackState { return this.state; }
  public isFinished(): boolean { return this.state === PlaybackState.Finished; }

  public getTraceMetadata(): { rngSeed?: number; rngAlgorithm?: string } {
    return {
      rngSeed: this.trace.rngSeed,
      rngAlgorithm: this.trace.rngAlgorithm,
    };
  }

  public getDebugInfo(): string {
    return `[MatchPlayer] State: ${this.state}, Time: ${this.currentTimestampMs.toFixed(2)}ms, Frame: ${this.currentFrameIndex}/${this.trace.events.length}, Rate: ${this.playbackRate}x`;
  }

  // ========================================================================
  // Replay & RNG Methods (T036)
  // ========================================================================

  private initializeRNG(): void {
    const seed = this.trace.rngSeed ?? this.rngSeed;
    this.rngManager = new RNGManager(seed);
  }

  public getRNGManager(): RNGManager | null { return this.rngManager; }
  public getReplayMode(): ReplayMode { return this.replayMode; }

  public setReplayMode(mode: ReplayMode): void {
    this.replayMode = mode;
    if (mode === ReplayMode.Deterministic && !this.rngManager) {
      this.initializeRNG();
    } else if (mode === ReplayMode.Live) {
      this.rngManager = null;
    }
  }

  public resetRNG(): void {
    if (this.rngManager) {
      this.rngManager.reset();
    }
  }

  public getRNGCallCount(): number { return this.rngManager?.getCallCount() ?? 0; }

  public validateRNGMetadata(): {
    valid: boolean;
    rngSeed?: number;
    rngAlgorithm?: string;
    warning?: string;
  } {
    const traceSeed = this.trace.rngSeed;
    const traceAlgo = this.trace.rngAlgorithm;

    if (!traceSeed || !traceAlgo) {
      return {
        valid: false,
        warning: "Trace missing RNG metadata. Deterministic replay may not be reproducible.",
      };
    }

    if (traceAlgo !== RNG_ALGORITHM_ID) {
      return {
        valid: false,
        rngSeed: traceSeed,
        rngAlgorithm: traceAlgo,
        warning: `RNG algorithm mismatch: trace uses "${traceAlgo}", we use "${RNG_ALGORITHM_ID}". Replay may diverge.`,
      };
    }

    return {
      valid: true,
      rngSeed: traceSeed,
      rngAlgorithm: traceAlgo,
    };
  }
}
