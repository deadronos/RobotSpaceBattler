/**
 * Playback Clock — Time and Frame Management
 *
 * Manages playback state, timestamps, and frame progression.
 * Extracted from MatchPlayer for modularity (T063).
 *
 * Responsibilities:
 * - Track current playback position (timestamp and frame)
 * - Manage playback state (idle, playing, paused, finished)
 * - Handle time advancement and seeking
 * - Calculate playback progress
 */

export enum PlaybackState {
  Idle = "idle",
  Playing = "playing",
  Paused = "paused",
  Finished = "finished",
}

/**
 * PlaybackClock manages time and frame position during trace playback.
 */
export class PlaybackClock {
  private currentTimestampMs: number = 0;
  private currentFrameIndex: number = 0;
  private state: PlaybackState = PlaybackState.Idle;
  private playbackRate: number = 1.0;
  private maxTimestamp: number;
  private maxFrameIndex: number;

  /**
   * Initialize clock with duration and frame count.
   * @param maxTimestamp - Maximum timestamp in trace (ms)
   * @param maxFrameIndex - Total number of events/frames
   */
  constructor(maxTimestamp: number, maxFrameIndex: number) {
    this.maxTimestamp = maxTimestamp;
    this.maxFrameIndex = maxFrameIndex;
  }

  /**
   * Start playback.
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
   * Advance playback by time delta (in real time).
   * Converts to trace-time using playback rate.
   * Frame index is managed separately by MatchPlayer.
   * @param deltaMs - Real-world time elapsed since last step (ms)
   */
  public advance(deltaMs: number): void {
    if (this.state !== PlaybackState.Playing) {
      return;
    }

    // Convert real-time delta to trace-time using playback rate
    const traceTimeDelta = deltaMs * this.playbackRate;
    this.currentTimestampMs += traceTimeDelta;

    // Clamp to trace duration
    if (this.currentTimestampMs >= this.maxTimestamp) {
      this.currentTimestampMs = this.maxTimestamp;
      this.state = PlaybackState.Finished;
    }
  }

  /**
   * Seek to a specific timestamp (in trace time, not real time).
   * Frame index is managed separately by MatchPlayer.
   * @param timestampMs - Target timestamp
   */
  public seek(timestampMs: number): void {
    this.currentTimestampMs = Math.max(0, Math.min(timestampMs, this.maxTimestamp));

    // If at end, mark as finished
    if (this.currentTimestampMs >= this.maxTimestamp) {
      this.state = PlaybackState.Finished;
    }
  }

  /**
   * Advance to next frame (debug mode).
   * @param maxFrames - Total frames available
   * @returns true if advanced, false if at end
   */
  public stepFrame(maxFrames: number): boolean {
    if (this.isFinished() || this.currentFrameIndex >= maxFrames - 1) {
      this.state = PlaybackState.Finished;
      return false;
    }
    this.currentFrameIndex += 1;
    return true;
  }

  /**
   * Get current timestamp.
   */
  public getCurrentTimestamp(): number {
    return this.currentTimestampMs;
  }

  /**
   * Get current frame index.
   */
  public getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /**
   * Get current playback state.
   */
  public getState(): PlaybackState {
    return this.state;
  }

  /**
   * Check if playback is finished.
   */
  public isFinished(): boolean {
    return this.state === PlaybackState.Finished;
  }

  /**
   * Get playback progress (0-1).
   */
  public getProgress(): number {
    if (this.maxTimestamp === 0) {
      return 1.0;
    }
    return Math.min(this.currentTimestampMs / this.maxTimestamp, 1.0);
  }

  /**
   * Set playback rate (speed multiplier).
   * @param rate - 1.0 = normal, 2.0 = 2x speed, 0.5 = half speed
   */
  public setPlaybackRate(rate: number): void {
    this.playbackRate = Math.max(0.1, rate);
  }

  /**
   * Get current playback rate.
   */
  public getPlaybackRate(): number {
    return this.playbackRate;
  }
}
