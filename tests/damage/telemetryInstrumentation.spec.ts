/**
 * Damage Pipeline Telemetry Instrumentation Tests
 * Task: T020
 * Spec: specs/005-weapon-diversity/spec.md
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  recordWeaponFired,
  recordWeaponHit,
  recordExplosionAoE,
  recordWeaponDamage,
  DamageTelemetryContext,
} from "../../src/simulation/damage/damagePipeline";
import { globalTelemetryAggregator } from "../../src/telemetry/aggregator";

describe("Damage Pipeline Telemetry", () => {
  beforeEach(() => {
    globalTelemetryAggregator.reset();
    globalTelemetryAggregator.startMatch("test-match-1");
  });

  describe("recordWeaponFired", () => {
    it("should record weapon-fired event", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "gun",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1000,
        archetype: "gun",
      };

      recordWeaponFired(context);

      const summary = globalTelemetryAggregator.summary();
      expect(summary.eventCountsByType["weapon-fired"]).toBe(1);

      const events = globalTelemetryAggregator.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("weapon-fired");
      expect(events[0].weaponProfileId).toBe("gun");
      expect(events[0].archetype).toBe("gun");
    });
  });

  describe("recordWeaponHit", () => {
    it("should record weapon-hit event", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "laser",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1100,
        archetype: "laser",
      };

      recordWeaponHit(context);

      const summary = globalTelemetryAggregator.summary();
      expect(summary.eventCountsByType["weapon-hit"]).toBe(1);

      const events = globalTelemetryAggregator.getEvents();
      expect(events[0].type).toBe("weapon-hit");
      expect(events[0].archetype).toBe("laser");
    });
  });

  describe("recordExplosionAoE", () => {
    it("should record explosion-aoe event with radius", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "rocket",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1200,
        archetype: "rocket",
        isAoE: true,
        aoeRadius: 2.5,
      };

      recordExplosionAoE(context);

      const summary = globalTelemetryAggregator.summary();
      expect(summary.eventCountsByType["explosion-aoe"]).toBe(1);

      const events = globalTelemetryAggregator.getEvents();
      expect(events[0].type).toBe("explosion-aoe");
      expect(events[0].archetype).toBe("rocket");
      expect(events[0].isAoE).toBe(true);
      expect(events[0].aoeRadius).toBe(2.5);
    });
  });

  describe("recordWeaponDamage", () => {
    it("should record weapon-damage event with amount", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "gun",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1300,
        archetype: "gun",
      };

      recordWeaponDamage(context, 16.5);

      const summary = globalTelemetryAggregator.summary();
      expect(summary.eventCountsByType["weapon-damage"]).toBe(1);
      expect(summary.damageTotalsByWeapon["gun"]).toBeCloseTo(16.5, 1);

      const events = globalTelemetryAggregator.getEvents();
      expect(events[0].type).toBe("weapon-damage");
      expect(events[0].amount).toBe(16.5);
      expect(events[0].archetype).toBe("gun");
    });

    it("should include frameIndex for laser beams", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "laser",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1400,
        archetype: "laser",
        frameIndex: 5,
      };

      recordWeaponDamage(context, 2.8);

      const events = globalTelemetryAggregator.getEvents();
      expect(events[0].frameIndex).toBe(5);
    });

    it("should mark AoE damage events", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "rocket",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1500,
        archetype: "rocket",
        isAoE: true,
      };

      recordWeaponDamage(context, 20.0);

      const events = globalTelemetryAggregator.getEvents();
      expect(events[0].isAoE).toBe(true);
    });
  });

  describe("Full damage sequence", () => {
    it("should record complete weapon cycle: fired -> hit -> damage", () => {
      const context: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "gun",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1000,
        archetype: "gun",
      };

      recordWeaponFired(context);
      recordWeaponHit({ ...context, timestampMs: 1100 });
      recordWeaponDamage({ ...context, timestampMs: 1100 }, 16);

      const summary = globalTelemetryAggregator.summary();
      expect(summary.eventCountsByType["weapon-fired"]).toBe(1);
      expect(summary.eventCountsByType["weapon-hit"]).toBe(1);
      expect(summary.eventCountsByType["weapon-damage"]).toBe(1);
      expect(summary.damageTotalsByWeapon["gun"]).toBe(16);
    });

    it("should record rocket AoE sequence: fired -> explosion -> multiple damage", () => {
      const baseContext: DamageTelemetryContext = {
        matchId: "test-match-1",
        weaponProfileId: "rocket",
        attackerId: "robot-1",
        targetId: "robot-2",
        timestampMs: 1000,
        archetype: "rocket",
        aoeRadius: 2.5,
      };

      recordWeaponFired(baseContext);
      recordExplosionAoE({ ...baseContext, timestampMs: 1200 });
      recordWeaponDamage(
        { ...baseContext, timestampMs: 1200, isAoE: true },
        24,
      );
      recordWeaponDamage(
        {
          ...baseContext,
          timestampMs: 1200,
          targetId: "robot-3",
          isAoE: true,
        },
        18,
      );
      recordWeaponDamage(
        {
          ...baseContext,
          timestampMs: 1200,
          targetId: "robot-4",
          isAoE: true,
        },
        12,
      );

      const summary = globalTelemetryAggregator.summary();
      expect(summary.eventCountsByType["weapon-fired"]).toBe(1);
      expect(summary.eventCountsByType["explosion-aoe"]).toBe(1);
      expect(summary.eventCountsByType["weapon-damage"]).toBe(3);
      expect(summary.damageTotalsByWeapon["rocket"]).toBe(54); // 24 + 18 + 12
    });
  });
});
