/**
 * Tests for TelemetryAggregator
 * Spec: specs/005-weapon-diversity/spec.md (FR-009)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryAggregator } from '../../src/telemetry/aggregator';
import type { WeaponTelemetryEvent } from '../../src/lib/weapons/types';

describe('TelemetryAggregator', () => {
  let aggregator: TelemetryAggregator;

  beforeEach(() => {
    aggregator = new TelemetryAggregator();
  });

  describe('startMatch', () => {
    it('should initialize a new match', () => {
      aggregator.startMatch('match-001');
      const stats = aggregator.getMatchStats();

      expect(stats).not.toBeNull();
      expect(stats?.matchId).toBe('match-001');
      expect(stats?.eventCountsByType['weapon-fired']).toBe(0);
    });

    it('should archive previous match when starting new one', () => {
      aggregator.startMatch('match-001');
      aggregator.record({
        type: 'weapon-fired',
        matchId: 'match-001',
        weaponProfileId: 'laser-1',
        timestampMs: 1000,
      });

      aggregator.startMatch('match-002');
      
      const completedMatch = aggregator.getCompletedMatch('match-001');
      expect(completedMatch).toBeDefined();
      expect(completedMatch?.eventCountsByType['weapon-fired']).toBe(1);

      const currentStats = aggregator.getMatchStats();
      expect(currentStats?.matchId).toBe('match-002');
      expect(currentStats?.eventCountsByType['weapon-fired']).toBe(0);
    });
  });

  describe('record', () => {
    beforeEach(() => {
      aggregator.startMatch('test-match');
    });

    it('should record pickup-acquired events', () => {
      const event: WeaponTelemetryEvent = {
        type: 'pickup-acquired',
        matchId: 'test-match',
        weaponProfileId: 'gun-1',
        attackerId: 'robot-1',
        timestampMs: 1000,
      };

      aggregator.record(event);

      const stats = aggregator.getMatchStats();
      expect(stats?.eventCountsByType['pickup-acquired']).toBe(1);
      expect(stats?.pickupsByWeapon['gun-1']).toBe(1);
    });

    it('should record weapon-fired events', () => {
      const event: WeaponTelemetryEvent = {
        type: 'weapon-fired',
        matchId: 'test-match',
        weaponProfileId: 'laser-1',
        attackerId: 'robot-1',
        timestampMs: 2000,
      };

      aggregator.record(event);

      const stats = aggregator.getMatchStats();
      expect(stats?.eventCountsByType['weapon-fired']).toBe(1);
      expect(stats?.shotsFiredByWeapon['laser-1']).toBe(1);
    });

    it('should record weapon-hit events', () => {
      const event: WeaponTelemetryEvent = {
        type: 'weapon-hit',
        matchId: 'test-match',
        weaponProfileId: 'rocket-1',
        attackerId: 'robot-1',
        targetId: 'robot-2',
        timestampMs: 3000,
      };

      aggregator.record(event);

      const stats = aggregator.getMatchStats();
      expect(stats?.eventCountsByType['weapon-hit']).toBe(1);
      expect(stats?.hitsRegisteredByWeapon['rocket-1']).toBe(1);
    });

    it('should aggregate weapon-damage by profile and archetype', () => {
      aggregator.record({
        type: 'weapon-damage',
        matchId: 'test-match',
        weaponProfileId: 'gun-1',
        attackerId: 'robot-1',
        targetId: 'robot-2',
        amount: 50,
        archetype: 'gun',
        timestampMs: 4000,
      });

      aggregator.record({
        type: 'weapon-damage',
        matchId: 'test-match',
        weaponProfileId: 'gun-1',
        attackerId: 'robot-1',
        targetId: 'robot-2',
        amount: 30,
        archetype: 'gun',
        timestampMs: 4100,
      });

      const stats = aggregator.getMatchStats();
      expect(stats?.damageTotalsByWeapon['gun-1']).toBe(80);
      expect(stats?.damageByArchetype.gun).toBe(80);
    });

    it('should warn when recording to non-matching matchId', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      aggregator.record({
        type: 'weapon-fired',
        matchId: 'wrong-match',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("doesn't match active match")
      );

      consoleSpy.mockRestore();
    });

    it('should warn when no active match', () => {
      aggregator.endMatch();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      aggregator.record({
        type: 'weapon-fired',
        matchId: 'test-match',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No active match')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('summary', () => {
    it('should provide a summary of current match', () => {
      aggregator.startMatch('summary-test');

      aggregator.record({
        type: 'weapon-damage',
        matchId: 'summary-test',
        weaponProfileId: 'laser-1',
        amount: 100,
        archetype: 'laser',
        timestampMs: 1000,
      });

      const summary = aggregator.summary();

      expect(summary.matchId).toBe('summary-test');
      expect(summary.damageTotalsByWeapon['laser-1']).toBe(100);
      expect(summary.eventCountsByType['weapon-damage']).toBe(1);
      expect(summary.timestampMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw when no active match', () => {
      expect(() => aggregator.summary()).toThrow('No active match');
    });
  });

  describe('getAccuracy', () => {
    beforeEach(() => {
      aggregator.startMatch('accuracy-test');
    });

    it('should calculate accuracy correctly', () => {
      // Fire 10 shots
      for (let i = 0; i < 10; i++) {
        aggregator.record({
          type: 'weapon-fired',
          matchId: 'accuracy-test',
          weaponProfileId: 'gun-1',
          timestampMs: 1000 + i * 100,
        });
      }

      // 7 hits
      for (let i = 0; i < 7; i++) {
        aggregator.record({
          type: 'weapon-hit',
          matchId: 'accuracy-test',
          weaponProfileId: 'gun-1',
          timestampMs: 2000 + i * 100,
        });
      }

      const accuracy = aggregator.getAccuracy('gun-1');
      expect(accuracy).toBe(0.7);
    });

    it('should return 0 for weapons with no shots', () => {
      const accuracy = aggregator.getAccuracy('unused-weapon');
      expect(accuracy).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all data', () => {
      aggregator.startMatch('reset-test');
      aggregator.record({
        type: 'weapon-fired',
        matchId: 'reset-test',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      });
      aggregator.endMatch();

      aggregator.reset();

      expect(aggregator.getMatchStats()).toBeNull();
      expect(aggregator.getCompletedMatch('reset-test')).toBeUndefined();
    });
  });

  describe('getDamageByArchetype', () => {
    beforeEach(() => {
      aggregator.startMatch('archetype-test');
    });

    it('should aggregate damage by archetype', () => {
      aggregator.record({
        type: 'weapon-damage',
        matchId: 'archetype-test',
        weaponProfileId: 'gun-1',
        amount: 50,
        archetype: 'gun',
        timestampMs: 1000,
      });

      aggregator.record({
        type: 'weapon-damage',
        matchId: 'archetype-test',
        weaponProfileId: 'laser-1',
        amount: 75,
        archetype: 'laser',
        timestampMs: 2000,
      });

      aggregator.record({
        type: 'weapon-damage',
        matchId: 'archetype-test',
        weaponProfileId: 'rocket-1',
        amount: 100,
        archetype: 'rocket',
        timestampMs: 3000,
      });

      const damageByArchetype = aggregator.getDamageByArchetype();

      expect(damageByArchetype.gun).toBe(50);
      expect(damageByArchetype.laser).toBe(75);
      expect(damageByArchetype.rocket).toBe(100);
    });
  });

  describe('getEvents', () => {
    it('should return all events for current match', () => {
      aggregator.startMatch('events-test');

      aggregator.record({
        type: 'weapon-fired',
        matchId: 'events-test',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      });

      aggregator.record({
        type: 'weapon-hit',
        matchId: 'events-test',
        weaponProfileId: 'gun-1',
        timestampMs: 2000,
      });

      const events = aggregator.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].type).toBe('weapon-fired');
      expect(events[1].type).toBe('weapon-hit');
    });

    it('should return events for completed match by matchId', () => {
      aggregator.startMatch('completed-test');
      aggregator.record({
        type: 'weapon-fired',
        matchId: 'completed-test',
        weaponProfileId: 'gun-1',
        timestampMs: 1000,
      });
      aggregator.endMatch();

      const events = aggregator.getEvents('completed-test');
      expect(events).toHaveLength(1);
      expect(events[0].matchId).toBe('completed-test');
    });
  });
});
