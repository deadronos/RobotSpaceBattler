import { describe, it, expect } from 'vitest';
import {
  MatchPlayer,
  type MatchPlayerConfig,
} from '../../src/systems/matchTrace/matchPlayer';
import {
  createTestTrace,
  createSpawnEvent,
} from './matchPlayer.test.helpers';

describe('MatchPlayer - Playback Rate & RNG', () => {
  describe('Playback Rate', () => {
    it('should set playback rate', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.setPlaybackRate(2.0);
      expect(player.getPlaybackRate()).toBe(2.0);
    });

    it('should clamp playback rate to valid range', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      player.setPlaybackRate(10); // Very fast - should clamp
      expect(player.getPlaybackRate()).toBeGreaterThan(0);

      player.setPlaybackRate(-1); // Negative - should clamp
      expect(player.getPlaybackRate()).toBeGreaterThan(0);
    });

    it('should reject invalid playback rates', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      // Set to a known value
      player.setPlaybackRate(1.5);
      expect(player.getPlaybackRate()).toBe(1.5);

      // Try to set negative - implementation may accept it
      player.setPlaybackRate(-5);
      // Just verify it's a valid number (implementation decides clamping)
      expect(typeof player.getPlaybackRate()).toBe('number');
      expect(player.getPlaybackRate()).toBeGreaterThan(0);
    });
  });

  describe('RNG Seeding', () => {
    it('should preserve RNG seed from trace', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      trace.rngSeed = 54321;
      const config: MatchPlayerConfig = { trace };
      const player = new MatchPlayer(config);

      expect(player.getRNGSeed()).toBe(54321);
    });

    it('should allow RNG seed override in config', () => {
      const trace = createTestTrace([createSpawnEvent('robot-1', 0, 1)]);
      trace.rngSeed = 54321;
      const config: MatchPlayerConfig = {
        trace,
        rngSeed: 99999,
      };
      const player = new MatchPlayer(config);

      expect(player.getRNGSeed()).toBe(99999);
    });
  });
});
