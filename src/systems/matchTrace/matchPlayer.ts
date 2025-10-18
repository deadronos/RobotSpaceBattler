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
import { MatchTrace, MatchTraceEvent } from "./types";

// ============================================================================
// Types & Constants
// ============================================================================

export enum PlaybackState {
  Idle = "idle",
  Playing = "playing",
  Paused = "paused",
  Finished = "finished",
}

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
  private playbackRate: number = 1.0;
  private currentTimestampMs: number = 0;
  private currentFrameIndex: number = 0;
  private state: PlaybackState = PlaybackState.Idle;
  private debugMode: boolean = false;
  private rngSeed: number;
  private replayMode: ReplayMode = ReplayMode.Live;
  private rngManager: RNGManager | null = null; // T036: RNG manager for deterministic replay

  // Event index cache (for efficient event lookup)
  private eventsByTimestamp: Map<number, MatchTraceEvent[]> = new Map();

  constructor(config: MatchPlayerConfig) {
    this.trace = config.trace;
    this.playbackRate = config.playbackRate ?? 1.0;
    this.debugMode = config.debugMode ?? false;
    this.rngSeed = config.rngSeed ?? this.trace.rngSeed ?? 0;
    this.replayMode = config.replayMode ?? ReplayMode.Live;

    // Build event index by timestamp
    this.buildEventIndex();

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
   * Build efficient lookup map of events by timestamp.
   * Multiple events can occur at the same timestamp (use sequenceId for ordering).
   */
  private buildEventIndex(): void {
    this.eventsByTimestamp.clear();
    for (const event of this.trace.events) {
      const ts = event.timestampMs;
      if (!this.eventsByTimestamp.has(ts)) {
        this.eventsByTimestamp.set(ts, []);
      }
      this.eventsByTimestamp.get(ts)!.push(event);
    }
  }

  /**
   * Start playback from current position.
   */
  public play(): void {
    if (this.state !== PlaybackState.Finished) {
      this.state = PlaybackState.Playing;
    }
  }

  /**
   * Pause playback.
   */
  public pause(): void {
    if (this.state === PlaybackState.Playing) {
      this.state = PlaybackState.Paused;
    }
  }

  /**
   * Stop and reset to beginning.
   */
  public stop(): void {
    this.currentTimestampMs = 0;
    this.currentFrameIndex = 0;
    this.state = PlaybackState.Idle;
  }

  /**
   * Advance playback by delta milliseconds (in real time).
   * Converts to trace-time using playbackRate.
   *
   * @param deltaMs - Real-world time elapsed since last step (ms)
   */
  public step(deltaMs: number): void {
    if (this.state !== PlaybackState.Playing) {
      return;
    }

    // Convert real-time delta to trace-time using playback rate
    const traceTimeDelta = deltaMs * this.playbackRate;
    this.currentTimestampMs += traceTimeDelta;

    // Clamp to trace duration
    const maxTimestamp = this.getMaxTimestamp();
    if (this.currentTimestampMs >= maxTimestamp) {
      this.currentTimestampMs = maxTimestamp;
      this.state = PlaybackState.Finished;
    }

    // Update frame index based on current timestamp
    this.currentFrameIndex = this.findFrameIndexAtTimestamp(
      this.currentTimestampMs,
    );
  }

  /**
   * Seek to a specific timestamp (in trace time, not real time).
   *
   * @param timestampMs - Target timestamp in match trace
   */
  public seek(timestampMs: number): void {
    const maxTs = this.getMaxTimestamp();
    this.currentTimestampMs = Math.max(0, Math.min(timestampMs, maxTs));
    this.currentFrameIndex = this.findFrameIndexAtTimestamp(
      this.currentTimestampMs,
    );

    // If at end, mark as finished
    if (this.currentTimestampMs >= maxTs) {
      this.state = PlaybackState.Finished;
    }
  }

  /**
   * Frame-step mode: advance to next event in sequence.
   * Only usable in debugMode.
   */
  public stepFrame(): void {
    if (!this.debugMode) {
      console.warn("MatchPlayer.stepFrame() only available in debugMode");
      return;
    }

    if (this.currentFrameIndex >= this.trace.events.length - 1) {
      this.state = PlaybackState.Finished;
      return;
    }

    const nextEvent = this.trace.events[this.currentFrameIndex + 1];
    this.currentTimestampMs = nextEvent.timestampMs;
    this.currentFrameIndex += 1;
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
   * Useful for reconstructing entity state at that point in time.
   */
  public getEventsBefore(timestampMs: number): MatchTraceEvent[] {
    const result: MatchTraceEvent[] = [];
    for (const event of this.trace.events) {
      if (event.timestampMs <= timestampMs) {
        result.push(event);
      }
    }
    return result;
  }

  /**
   * Get events at the exact current timestamp (for triggering events).
   */
  private getEventsAtTimestamp(timestampMs: number): MatchTraceEvent[] {
    return this.eventsByTimestamp.get(timestampMs) || [];
  }

  /**
   * Find frame (event index) that corresponds to a timestamp.
   */
  private findFrameIndexAtTimestamp(timestampMs: number): number {
    let index = 0;
    for (let i = 0; i < this.trace.events.length; i++) {
      if (this.trace.events[i].timestampMs <= timestampMs) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  /**
   * Get maximum timestamp in trace.
   */
  private getMaxTimestamp(): number {
    if (this.trace.events.length === 0) {
      return 0;
    }
    return this.trace.events[this.trace.events.length - 1].timestampMs;
  }

  // ========================================================================
  // Configuration Getters/Setters
  // ========================================================================

  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, rate);
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  public getRNGSeed(): number {
    return this.rngSeed;
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public isFinished(): boolean {
    return this.state === PlaybackState.Finished;
  }

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

  /**
   * Initialize RNG manager for deterministic replay.
   * Creates new RNG instance with trace seed if available, otherwise uses provided rngSeed.
   */
  private initializeRNG(): void {
    const seed = this.trace.rngSeed ?? this.rngSeed;
    this.rngManager = new RNGManager(seed);
  }

  /**
   * Get RNG manager instance for deterministic operations.
   * Returns null if not in deterministic replay mode.
   */
  public getRNGManager(): RNGManager | null {
    return this.rngManager;
  }

  /**
   * Switch replay mode and reinitialize RNG if needed.
   */
  public setReplayMode(mode: ReplayMode): void {
    this.replayMode = mode;
    if (mode === ReplayMode.Deterministic && !this.rngManager) {
      this.initializeRNG();
    } else if (mode === ReplayMode.Live) {
      this.rngManager = null;
    }
  }

  /**
   * Get current replay mode.
   */
  public getReplayMode(): ReplayMode {
    return this.replayMode;
  }

  /**
   * Reset RNG to initial seed (for replay restart).
   */
  public resetRNG(): void {
    if (this.rngManager) {
      this.rngManager.reset();
    }
  }

  /**
   * Validate that trace has proper RNG metadata for deterministic replay.
   * Returns validation report with seed and algorithm info.
   */
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
        warning:
          "Trace missing RNG metadata. Deterministic replay may not be reproducible.",
      };
    }

    // Check if algorithm matches our implementation
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

  /**
   * Get RNG call count (for debugging).
   */
  public getRNGCallCount(): number {
    return this.rngManager?.getCallCount() ?? 0;
  }
}
