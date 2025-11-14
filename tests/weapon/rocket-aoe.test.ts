/**
 * Rocket AoE Integration Test
 * Task: T021
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Validates:
 * - AoE damage mechanics with linear falloff
 * - Deterministic event ordering (sorted by targetId)
 * - Proper telemetry emission
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyRocketExplosion,
  RocketExplosionParams,
} from "../../src/simulation/projectiles/rocket";
import { globalTelemetryAggregator } from "../../src/telemetry/aggregator";
import type { WeaponTelemetryEvent } from "../../src/lib/weapons/types";

describe("Rocket AoE Integration", () => {
  let events: WeaponTelemetryEvent[];

  beforeEach(() => {
    globalTelemetryAggregator.reset();
    globalTelemetryAggregator.startMatch("test-match");
    events = [];
  });

  const recordEvent = (event: WeaponTelemetryEvent) => {
    events.push(event);
  };

  it("should apply AoE damage with linear falloff", () => {
    const targets = [
      {
        id: "robot-1",
        position: [0, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-2",
        position: [1, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-3",
        position: [2, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-4",
        position: [2.5, 0, 0] as [number, number, number],
        health: 100,
      },
    ];

    const params: RocketExplosionParams = {
      origin: [0, 0, 0],
      radius: 2.5,
      baseDamage: 100,
      weaponProfileId: "rocket",
      ownerId: "attacker-1",
      matchId: "test-match",
      timestampMs: 1000,
      targets,
      recordEvent,
    };

    applyRocketExplosion(params);

    const damageEvents = events.filter((e) => e.type === "weapon-damage");

    // Verify all targets in range receive damage
    expect(damageEvents).toHaveLength(4);

    // Check linear falloff: damage = baseDamage * (1 - distance/radius)
    const robot1Dmg = damageEvents.find((e) => e.targetId === "robot-1");
    expect(robot1Dmg?.amount).toBe(100); // distance 0

    const robot2Dmg = damageEvents.find((e) => e.targetId === "robot-2");
    expect(robot2Dmg?.amount).toBeCloseTo(60, 1); // distance 1: 100 * (1 - 1/2.5) = 60

    const robot3Dmg = damageEvents.find((e) => e.targetId === "robot-3");
    expect(robot3Dmg?.amount).toBeCloseTo(20, 1); // distance 2: 100 * (1 - 2/2.5) = 20

    const robot4Dmg = damageEvents.find((e) => e.targetId === "robot-4");
    expect(robot4Dmg?.amount).toBeCloseTo(0, 1); // distance 2.5: at edge
  });

  it("should emit events in deterministic order (sorted by targetId)", () => {
    const targets = [
      {
        id: "robot-zulu",
        position: [0.5, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-alpha",
        position: [1, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-charlie",
        position: [1.5, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-bravo",
        position: [0.8, 0, 0] as [number, number, number],
        health: 100,
      },
    ];

    const params: RocketExplosionParams = {
      origin: [0, 0, 0],
      radius: 2.5,
      baseDamage: 100,
      weaponProfileId: "rocket",
      ownerId: "attacker-1",
      matchId: "test-match",
      timestampMs: 1000,
      targets,
      recordEvent,
    };

    applyRocketExplosion(params);

    const damageEvents = events.filter((e) => e.type === "weapon-damage");
    const targetIds = damageEvents.map((e) => e.targetId);

    // Should be sorted alphabetically regardless of input order
    expect(targetIds).toEqual([
      "robot-alpha",
      "robot-bravo",
      "robot-charlie",
      "robot-zulu",
    ]);
  });

  it("should emit explosion-aoe event before damage events", () => {
    const targets = [
      {
        id: "robot-1",
        position: [0, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-2",
        position: [1, 0, 0] as [number, number, number],
        health: 100,
      },
    ];

    const params: RocketExplosionParams = {
      origin: [0, 0, 0],
      radius: 2.5,
      baseDamage: 100,
      weaponProfileId: "rocket",
      ownerId: "attacker-1",
      matchId: "test-match",
      timestampMs: 1000,
      targets,
      recordEvent,
    };

    applyRocketExplosion(params);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe("explosion-aoe");
    expect(events[0].weaponProfileId).toBe("rocket");
    expect(events[0].aoeRadius).toBe(2.5);
  });

  it("should not damage targets beyond radius", () => {
    const targets = [
      {
        id: "robot-near",
        position: [1, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-far",
        position: [5, 0, 0] as [number, number, number],
        health: 100,
      },
      {
        id: "robot-edge",
        position: [2.5, 0, 0] as [number, number, number],
        health: 100,
      },
    ];

    const params: RocketExplosionParams = {
      origin: [0, 0, 0],
      radius: 2.5,
      baseDamage: 100,
      weaponProfileId: "rocket",
      ownerId: "attacker-1",
      matchId: "test-match",
      timestampMs: 1000,
      targets,
      recordEvent,
    };

    applyRocketExplosion(params);

    const damageEvents = events.filter((e) => e.type === "weapon-damage");
    const targetIds = damageEvents.map((e) => e.targetId);

    expect(targetIds).toContain("robot-near");
    expect(targetIds).toContain("robot-edge");
    expect(targetIds).not.toContain("robot-far"); // Beyond radius
  });

  it("should include all required telemetry fields", () => {
    const targets = [
      {
        id: "robot-1",
        position: [1, 0, 0] as [number, number, number],
        health: 100,
      },
    ];

    const params: RocketExplosionParams = {
      origin: [0, 0, 0],
      radius: 2.5,
      baseDamage: 100,
      weaponProfileId: "rocket",
      ownerId: "attacker-1",
      matchId: "test-match",
      timestampMs: 1000,
      targets,
      recordEvent,
    };

    applyRocketExplosion(params);

    const aoeEvent = events.find((e) => e.type === "explosion-aoe");
    expect(aoeEvent?.matchId).toBe("test-match");
    expect(aoeEvent?.weaponProfileId).toBe("rocket");
    expect(aoeEvent?.archetype).toBe("rocket");
    expect(aoeEvent?.isAoE).toBe(true);

    const damageEvent = events.find((e) => e.type === "weapon-damage");
    expect(damageEvent?.matchId).toBe("test-match");
    expect(damageEvent?.weaponProfileId).toBe("rocket");
    expect(damageEvent?.attackerId).toBe("attacker-1");
    expect(damageEvent?.targetId).toBe("robot-1");
    expect(damageEvent?.amount).toBeDefined();
    expect(damageEvent?.archetype).toBe("rocket");
    expect(damageEvent?.isAoE).toBe(true);
  });

  it("should handle empty target list", () => {
    const params: RocketExplosionParams = {
      origin: [0, 0, 0],
      radius: 2.5,
      baseDamage: 100,
      weaponProfileId: "rocket",
      ownerId: "attacker-1",
      matchId: "test-match",
      timestampMs: 1000,
      targets: [],
      recordEvent,
    };

    applyRocketExplosion(params);

    const aoeEvents = events.filter((e) => e.type === "explosion-aoe");
    const damageEvents = events.filter((e) => e.type === "weapon-damage");

    expect(aoeEvents).toHaveLength(1); // AoE event still emitted
    expect(damageEvents).toHaveLength(0); // No damage events
  });
});
