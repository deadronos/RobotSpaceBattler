/**
 * Laser Beam System Tests
 * Task: T018
 * Spec: specs/005-weapon-diversity/spec.md
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LaserBeamSystem,
  createLaserBeam,
  LaserBeamParams,
} from "../../src/simulation/weapons/laserBeam";
import type { WeaponTelemetryEvent } from "../../src/lib/weapons/types";

describe("LaserBeam", () => {
  describe("createLaserBeam", () => {
    it("should create a laser beam with 60Hz tick rate", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.5,
        startTimeMs: 1000,
        tickRate: 60,
      };

      const beam = createLaserBeam(params);

      expect(beam.id).toBe("beam-1");
      expect(beam.tickRate).toBe(60);
      expect(beam.tickIntervalMs).toBeCloseTo(16.67, 1); // 1000/60
      expect(beam.startTimeMs).toBe(1000);
      expect(beam.duration).toBe(0.5);
    });

    it("should use default 60Hz tick rate if not specified", () => {
      const params: LaserBeamParams = {
        id: "beam-2",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.5,
        startTimeMs: 1000,
      };

      const beam = createLaserBeam(params);

      expect(beam.tickRate).toBe(60);
    });
  });

  describe("LaserBeamSystem", () => {
    let system: LaserBeamSystem;
    let events: WeaponTelemetryEvent[];

    beforeEach(() => {
      system = new LaserBeamSystem();
      events = [];
    });

    const recordEvent = (event: WeaponTelemetryEvent) => {
      events.push(event);
    };

    it("should track active beams", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.5,
        startTimeMs: 1000,
        tickRate: 60,
      };

      const beam = system.startBeam(params);

      expect(system.getActiveBeams()).toHaveLength(1);
      expect(system.getBeam(beam.id)).toBeDefined();
    });

    it("should emit weapon-fired event when beam starts", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.5,
        startTimeMs: 1000,
        matchId: "match-1",
        tickRate: 60,
      };

      system.startBeam(params, recordEvent);

      const firedEvents = events.filter((e) => e.type === "weapon-fired");
      expect(firedEvents).toHaveLength(1);
      expect(firedEvents[0].weaponProfileId).toBe("laser");
      expect(firedEvents[0].attackerId).toBe("robot-1");
    });

    it("should emit weapon-damage events on each tick", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 60, // 60 damage total
        duration: 0.1, // 100ms duration
        startTimeMs: 1000,
        matchId: "match-1",
        tickRate: 60, // ~16.67ms per tick
      };

      system.startBeam(params, recordEvent);

      // Update at each tick interval
      system.update(1016, "match-1", recordEvent); // 16ms later (1 tick)
      system.update(1033, "match-1", recordEvent); // 33ms later (2 ticks)
      system.update(1050, "match-1", recordEvent); // 50ms later (3 ticks)
      system.update(1066, "match-1", recordEvent); // 66ms later (4 ticks)
      system.update(1083, "match-1", recordEvent); // 83ms later (5 ticks)
      system.update(1100, "match-1", recordEvent); // 100ms later (6 ticks) - should end

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      // Should have emitted damage events at 60Hz rate
      expect(damageEvents.length).toBeGreaterThanOrEqual(5);
      expect(damageEvents.length).toBeLessThanOrEqual(7); // Allow for timing tolerance
    });

    it("should include frameIndex in damage events for determinism", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 60,
        duration: 0.1,
        startTimeMs: 1000,
        matchId: "match-1",
        tickRate: 60,
      };

      system.startBeam(params, recordEvent);
      system.update(1016, "match-1", recordEvent);
      system.update(1033, "match-1", recordEvent);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      damageEvents.forEach((event) => {
        expect(event.frameIndex).toBeDefined();
        expect(typeof event.frameIndex).toBe("number");
      });

      // Frame indices should be sequential
      const frameIndices = damageEvents.map((e) => e.frameIndex as number);
      for (let i = 1; i < frameIndices.length; i++) {
        expect(frameIndices[i]).toBeGreaterThan(frameIndices[i - 1]);
      }
    });

    it("should remove beam after duration expires", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.05, // 50ms duration
        startTimeMs: 1000,
        matchId: "match-1",
        tickRate: 60,
      };

      system.startBeam(params, recordEvent);
      expect(system.getActiveBeams()).toHaveLength(1);

      // Update beyond duration
      system.update(1060, "match-1", recordEvent); // 60ms later

      expect(system.getActiveBeams()).toHaveLength(0);
    });

    it("should validate timing with ±16ms tolerance", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 60,
        duration: 0.1,
        startTimeMs: 1000,
        matchId: "match-1",
        tickRate: 60,
      };

      const tickIntervalMs = 1000 / 60; // ~16.67ms
      system.startBeam(params, recordEvent);

      // Update at expected tick times with small variation
      system.update(1000 + tickIntervalMs * 1 + 5, "match-1", recordEvent); // +5ms jitter
      system.update(1000 + tickIntervalMs * 2 - 3, "match-1", recordEvent); // -3ms jitter

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      // Should still emit events despite jitter within tolerance
      expect(damageEvents.length).toBeGreaterThan(0);
    });

    it("should include archetype in events", () => {
      const params: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.1,
        startTimeMs: 1000,
        matchId: "match-1",
        tickRate: 60,
      };

      system.startBeam(params, recordEvent);
      system.update(1016, "match-1", recordEvent);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      damageEvents.forEach((event) => {
        expect(event.archetype).toBe("laser");
      });
    });

    it("should clear all beams", () => {
      const params1: LaserBeamParams = {
        id: "beam-1",
        weaponProfileId: "laser",
        ownerId: "robot-1",
        targetId: "robot-2",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.5,
        startTimeMs: 1000,
      };

      const params2: LaserBeamParams = {
        id: "beam-2",
        weaponProfileId: "laser",
        ownerId: "robot-3",
        targetId: "robot-4",
        startPosition: [0, 0, 0],
        endPosition: [10, 0, 0],
        baseDamage: 14,
        duration: 0.5,
        startTimeMs: 1000,
      };

      system.startBeam(params1);
      system.startBeam(params2);
      expect(system.getActiveBeams()).toHaveLength(2);

      system.clear();
      expect(system.getActiveBeams()).toHaveLength(0);
    });
  });
});
