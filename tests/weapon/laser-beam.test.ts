/**
 * Laser Beam Integration Test
 * Task: T021
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Validates:
 * - Beam damage at 60Hz tick rate
 * - frameIndex tracking for deterministic replay
 * - Timing validation with ±16ms tolerance
 * - Proper telemetry emission
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LaserBeamSystem,
  LaserBeamParams,
} from "../../src/simulation/weapons/laserBeam";
import { globalTelemetryAggregator } from "../../src/telemetry/aggregator";
import type { WeaponTelemetryEvent } from "../../src/lib/weapons/types";

describe("Laser Beam Integration", () => {
  let system: LaserBeamSystem;
  let events: WeaponTelemetryEvent[];

  beforeEach(() => {
    system = new LaserBeamSystem();
    globalTelemetryAggregator.reset();
    globalTelemetryAggregator.startMatch("test-match");
    events = [];
  });

  const recordEvent = (event: WeaponTelemetryEvent) => {
    events.push(event);
  };

  it("should emit damage at 60Hz tick rate", () => {
    const tickIntervalMs = 1000 / 60; // ~16.67ms

    const params: LaserBeamParams = {
      id: "beam-1",
      weaponProfileId: "laser",
      ownerId: "robot-1",
      targetId: "robot-2",
      startPosition: [0, 0, 0],
      endPosition: [10, 0, 0],
      baseDamage: 60,
      duration: 0.1, // 100ms
      startTimeMs: 1000,
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);

    // Simulate updates at tick intervals
    const tickTimes = [
      1000 + tickIntervalMs * 1,
      1000 + tickIntervalMs * 2,
      1000 + tickIntervalMs * 3,
      1000 + tickIntervalMs * 4,
      1000 + tickIntervalMs * 5,
      1000 + tickIntervalMs * 6,
    ];

    tickTimes.forEach((time) => {
      system.update(Math.round(time), "test-match", recordEvent);
    });

    const damageEvents = events.filter((e) => e.type === "weapon-damage");

    // Should emit damage at each tick (approximately 6 ticks in 100ms at 60Hz)
    expect(damageEvents.length).toBeGreaterThanOrEqual(5);
    expect(damageEvents.length).toBeLessThanOrEqual(7); // Allow tolerance
  });

  it("should track frameIndex for deterministic replay", () => {
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
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);

    // Update multiple times
    system.update(1017, "test-match", recordEvent); // ~16ms
    system.update(1033, "test-match", recordEvent); // ~33ms
    system.update(1050, "test-match", recordEvent); // ~50ms

    const damageEvents = events.filter((e) => e.type === "weapon-damage");

    // All damage events should have frameIndex
    damageEvents.forEach((event) => {
      expect(event.frameIndex).toBeDefined();
      expect(typeof event.frameIndex).toBe("number");
    });

    // Frame indices should be sequential
    const frameIndices = damageEvents.map((e) => e.frameIndex as number);
    for (let i = 1; i < frameIndices.length; i++) {
      expect(frameIndices[i]).toBe(frameIndices[i - 1] + 1);
    }
  });

  it("should validate timing with ±16ms tolerance", () => {
    const tickIntervalMs = 1000 / 60; // ~16.67ms

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
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);

    // Update with timing jitter within tolerance
    system.update(1000 + tickIntervalMs * 1 + 5, "test-match", recordEvent); // +5ms jitter
    system.update(1000 + tickIntervalMs * 2 - 3, "test-match", recordEvent); // -3ms jitter
    system.update(1000 + tickIntervalMs * 3 + 8, "test-match", recordEvent); // +8ms jitter

    const damageEvents = events.filter((e) => e.type === "weapon-damage");

    // Should still emit events despite jitter within tolerance
    expect(damageEvents.length).toBeGreaterThan(0);

    // All events should have valid timestamps
    damageEvents.forEach((event) => {
      expect(event.timestampMs).toBeGreaterThanOrEqual(1000);
      expect(event.timestampMs).toBeLessThan(1100);
    });
  });

  it("should emit weapon-fired event at beam start", () => {
    const params: LaserBeamParams = {
      id: "beam-1",
      weaponProfileId: "laser",
      ownerId: "robot-1",
      targetId: "robot-2",
      startPosition: [0, 0, 0],
      endPosition: [10, 0, 0],
      baseDamage: 60,
      duration: 0.5,
      startTimeMs: 1000,
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);

    const firedEvents = events.filter((e) => e.type === "weapon-fired");

    expect(firedEvents).toHaveLength(1);
    expect(firedEvents[0].weaponProfileId).toBe("laser");
    expect(firedEvents[0].attackerId).toBe("robot-1");
    expect(firedEvents[0].targetId).toBe("robot-2");
    expect(firedEvents[0].archetype).toBe("laser");
  });

  it("should stop emitting damage after duration expires", () => {
    const params: LaserBeamParams = {
      id: "beam-1",
      weaponProfileId: "laser",
      ownerId: "robot-1",
      targetId: "robot-2",
      startPosition: [0, 0, 0],
      endPosition: [10, 0, 0],
      baseDamage: 60,
      duration: 0.05, // 50ms
      startTimeMs: 1000,
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);

    // Update during beam
    system.update(1016, "test-match", recordEvent);
    system.update(1033, "test-match", recordEvent);

    const damageEventsDuring = events.filter(
      (e) => e.type === "weapon-damage",
    ).length;

    // Update after beam expires
    system.update(1060, "test-match", recordEvent);
    system.update(1100, "test-match", recordEvent);

    const damageEventsAfter = events.filter(
      (e) => e.type === "weapon-damage",
    ).length;

    // No new damage events should be emitted after expiry
    expect(damageEventsAfter).toBe(damageEventsDuring);

    // Beam should be removed
    expect(system.getActiveBeams()).toHaveLength(0);
  });

  it("should include all required telemetry fields", () => {
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
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);
    system.update(1017, "test-match", recordEvent);

    const firedEvent = events.find((e) => e.type === "weapon-fired");
    expect(firedEvent?.matchId).toBe("test-match");
    expect(firedEvent?.weaponProfileId).toBe("laser");
    expect(firedEvent?.attackerId).toBe("robot-1");
    expect(firedEvent?.archetype).toBe("laser");

    const damageEvent = events.find((e) => e.type === "weapon-damage");
    expect(damageEvent?.matchId).toBe("test-match");
    expect(damageEvent?.weaponProfileId).toBe("laser");
    expect(damageEvent?.attackerId).toBe("robot-1");
    expect(damageEvent?.targetId).toBe("robot-2");
    expect(damageEvent?.amount).toBeDefined();
    expect(damageEvent?.frameIndex).toBeDefined();
    expect(damageEvent?.archetype).toBe("laser");
  });

  it("should handle multiple concurrent beams", () => {
    const params1: LaserBeamParams = {
      id: "beam-1",
      weaponProfileId: "laser",
      ownerId: "robot-1",
      targetId: "robot-2",
      startPosition: [0, 0, 0],
      endPosition: [10, 0, 0],
      baseDamage: 60,
      duration: 0.1,
      startTimeMs: 1000,
      matchId: "test-match",
      tickRate: 60,
    };

    const params2: LaserBeamParams = {
      id: "beam-2",
      weaponProfileId: "laser",
      ownerId: "robot-3",
      targetId: "robot-4",
      startPosition: [5, 5, 5],
      endPosition: [15, 5, 5],
      baseDamage: 60,
      duration: 0.1,
      startTimeMs: 1000,
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params1, recordEvent);
    system.startBeam(params2, recordEvent);

    expect(system.getActiveBeams()).toHaveLength(2);

    system.update(1017, "test-match", recordEvent);

    const damageEvents = events.filter((e) => e.type === "weapon-damage");

    // Should emit damage for both beams
    const beam1Damage = damageEvents.filter((e) => e.attackerId === "robot-1");
    const beam2Damage = damageEvents.filter((e) => e.attackerId === "robot-3");

    expect(beam1Damage.length).toBeGreaterThan(0);
    expect(beam2Damage.length).toBeGreaterThan(0);
  });

  it("should distribute damage evenly across ticks", () => {
    const params: LaserBeamParams = {
      id: "beam-1",
      weaponProfileId: "laser",
      ownerId: "robot-1",
      targetId: "robot-2",
      startPosition: [0, 0, 0],
      endPosition: [10, 0, 0],
      baseDamage: 60,
      duration: 0.1, // 100ms
      startTimeMs: 1000,
      matchId: "test-match",
      tickRate: 60,
    };

    system.startBeam(params, recordEvent);

    // Simulate full duration
    for (let t = 1; t <= 6; t++) {
      system.update(
        1000 + Math.round(t * (1000 / 60)),
        "test-match",
        recordEvent,
      );
    }

    const damageEvents = events.filter((e) => e.type === "weapon-damage");
    const totalDamage = damageEvents.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );

    // Total damage should approximately equal base damage
    expect(totalDamage).toBeGreaterThanOrEqual(40);
    expect(totalDamage).toBeLessThanOrEqual(70); // Allow some tolerance for timing variations
  });
});
