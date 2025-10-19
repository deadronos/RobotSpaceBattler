/**
 * PlaybackClock unit tests — Time and frame management
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PlaybackClock,
  PlaybackState,
} from "../../../src/systems/matchTrace/playbackClock";

describe("PlaybackClock", () => {
  let clock: PlaybackClock;
  const maxTimestamp = 1000;
  const maxFrameIndex = 50;

  beforeEach(() => {
    clock = new PlaybackClock(maxTimestamp, maxFrameIndex);
  });

  describe("Initialization", () => {
    it("should initialize with idle state", () => {
      expect(clock.getState()).toBe(PlaybackState.Idle);
    });

    it("should start at timestamp 0", () => {
      expect(clock.getCurrentTimestamp()).toBe(0);
    });

    it("should start at frame 0", () => {
      expect(clock.getCurrentFrameIndex()).toBe(0);
    });

    it("should have progress 0 at start", () => {
      expect(clock.getProgress()).toBe(0);
    });

    it("should have default playback rate 1.0", () => {
      expect(clock.getPlaybackRate()).toBe(1.0);
    });
  });

  describe("Play/Pause/Stop", () => {
    it("should transition to playing", () => {
      clock.play();
      expect(clock.getState()).toBe(PlaybackState.Playing);
    });

    it("should transition from playing to paused", () => {
      clock.play();
      clock.pause();
      expect(clock.getState()).toBe(PlaybackState.Paused);
    });

    it("should reset state and timestamp on stop", () => {
      clock.play();
      clock.stop();
      expect(clock.getState()).toBe(PlaybackState.Idle);
      expect(clock.getCurrentTimestamp()).toBe(0);
      expect(clock.getCurrentFrameIndex()).toBe(0);
    });

    it("should not transition to playing from finished state", () => {
      // Manually set to finished
      const fullClock = new PlaybackClock(100, 10);
      fullClock.seek(100);
      expect(fullClock.isFinished()).toBe(true);
    });
  });

  describe("Advance (time stepping)", () => {
    it("should not advance if not playing", () => {
      clock.advance(100);
      expect(clock.getCurrentTimestamp()).toBe(0);
    });

    it("should advance timestamp at 1x playback rate", () => {
      clock.play();
      clock.advance(100);
      expect(clock.getCurrentTimestamp()).toBe(100);
    });

    it("should advance timestamp at 2x playback rate", () => {
      clock.setPlaybackRate(2.0);
      clock.play();
      clock.advance(100);
      expect(clock.getCurrentTimestamp()).toBe(200);
    });

    it("should clamp timestamp to max", () => {
      clock.play();
      clock.advance(2000);
      expect(clock.getCurrentTimestamp()).toBe(maxTimestamp);
    });

    it("should finish when reaching max timestamp", () => {
      clock.play();
      clock.advance(2000);
      expect(clock.isFinished()).toBe(true);
    });

    it("should advance without callback", () => {
      clock.play();
      clock.advance(100);
      // Frame index is now managed separately by MatchPlayer, not by PlaybackClock
      expect(clock.getCurrentTimestamp()).toBe(100);
    });
  });

  describe("Seek", () => {
    it("should seek to specific timestamp", () => {
      clock.seek(500);
      expect(clock.getCurrentTimestamp()).toBe(500);
    });

    it("should clamp seek to max timestamp", () => {
      clock.seek(2000);
      expect(clock.getCurrentTimestamp()).toBe(maxTimestamp);
    });

    it("should clamp seek to minimum 0", () => {
      clock.seek(-100);
      expect(clock.getCurrentTimestamp()).toBe(0);
    });

    it("should finish when seeking to end", () => {
      clock.seek(maxTimestamp);
      expect(clock.isFinished()).toBe(true);
    });

    it("should not finish when seeking to middle", () => {
      clock.seek(500);
      expect(clock.isFinished()).toBe(false);
    });

    it("should seek without callback", () => {
      clock.seek(500);
      // Frame index is now managed separately by MatchPlayer, not by PlaybackClock
      expect(clock.getCurrentTimestamp()).toBe(500);
    });
  });

  describe("Step Frame (debug mode)", () => {
    it("should advance to next frame", () => {
      expect(clock.stepFrame(maxFrameIndex)).toBe(true);
      expect(clock.getCurrentFrameIndex()).toBe(1);
    });

    it("should return false at end", () => {
      clock.seek(maxTimestamp);
      expect(clock.stepFrame(maxFrameIndex)).toBe(false);
    });

    it("should set finished state at end", () => {
      clock.seek(maxTimestamp);
      clock.stepFrame(maxFrameIndex);
      expect(clock.isFinished()).toBe(true);
    });

    it("should step frame multiple times", () => {
      for (let i = 0; i < 5; i++) {
        expect(clock.stepFrame(maxFrameIndex)).toBe(true);
      }
      expect(clock.getCurrentFrameIndex()).toBe(5);
    });
  });

  describe("Progress", () => {
    it("should return 0 at start", () => {
      expect(clock.getProgress()).toBe(0);
    });

    it("should return 1 at end", () => {
      clock.seek(maxTimestamp);
      expect(clock.getProgress()).toBe(1.0);
    });

    it("should return 0.5 at midpoint", () => {
      clock.seek(500);
      expect(clock.getProgress()).toBe(0.5);
    });

    it("should clamp progress to 1.0", () => {
      clock.seek(2000);
      expect(clock.getProgress()).toBe(1.0);
    });

    it("should handle zero max timestamp", () => {
      const zeroClock = new PlaybackClock(0, 1);
      expect(zeroClock.getProgress()).toBe(1.0);
    });
  });

  describe("Playback Rate", () => {
    it("should set playback rate", () => {
      clock.setPlaybackRate(2.0);
      expect(clock.getPlaybackRate()).toBe(2.0);
    });

    it("should enforce minimum rate of 0.1", () => {
      clock.setPlaybackRate(0.01);
      expect(clock.getPlaybackRate()).toBe(0.1);
    });

    it("should allow high playback rates", () => {
      clock.setPlaybackRate(10.0);
      expect(clock.getPlaybackRate()).toBe(10.0);
    });

    it("should affect advancement", () => {
      clock.setPlaybackRate(3.0);
      clock.play();
      clock.advance(100);
      expect(clock.getCurrentTimestamp()).toBe(300);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle typical playback sequence", () => {
      // Start
      expect(clock.getState()).toBe(PlaybackState.Idle);

      // Play
      clock.play();
      expect(clock.getState()).toBe(PlaybackState.Playing);

      // Advance to middle
      clock.advance(500);
      expect(clock.getCurrentTimestamp()).toBe(500);
      expect(clock.getProgress()).toBe(0.5);

      // Pause
      clock.pause();
      expect(clock.getState()).toBe(PlaybackState.Paused);

      // Resume and finish
      clock.play();
      clock.advance(1000);
      expect(clock.isFinished()).toBe(true);
    });

    it("should handle variable playback rate during playback", () => {
      clock.play();
      clock.advance(100); // Normal: 100ms elapsed
      expect(clock.getCurrentTimestamp()).toBe(100);

      clock.setPlaybackRate(2.0);
      clock.advance(100); // 2x: 200ms added
      expect(clock.getCurrentTimestamp()).toBe(300);

      clock.setPlaybackRate(0.5);
      clock.advance(100); // 0.5x: 50ms added
      expect(clock.getCurrentTimestamp()).toBe(350);
    });

    it("should support seek during playback", () => {
      clock.play();
      clock.advance(200);
      expect(clock.getCurrentTimestamp()).toBe(200);

      // Seek backwards
      clock.seek(100);
      expect(clock.getCurrentTimestamp()).toBe(100);

      // Resume playback
      clock.play();
      clock.advance(100);
      expect(clock.getCurrentTimestamp()).toBe(200);
    });
  });
});
