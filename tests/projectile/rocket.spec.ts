/**
 * Rocket AoE Tests
 * Task: T017
 * Spec: specs/005-weapon-diversity/spec.md
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateAoeDamage,
  applyRocketExplosion,
  RocketExplosionParams,
} from "../../src/simulation/projectiles/rocket";
import type { WeaponTelemetryEvent } from "../../src/lib/weapons/types";

describe("Rocket AoE", () => {
  describe("calculateAoeDamage", () => {
    it("should return full damage at center (distance 0)", () => {
      const damage = calculateAoeDamage(100, 0, 2.5);
      expect(damage).toBe(100);
    });

    it("should apply linear falloff within radius", () => {
      const baseDamage = 100;
      const radius = 2.5;

      // At half radius, damage should be 50%
      const damageAtHalf = calculateAoeDamage(baseDamage, 1.25, radius);
      expect(damageAtHalf).toBeCloseTo(50, 1);

      // At edge (distance = radius), damage should be 0
      const damageAtEdge = calculateAoeDamage(baseDamage, 2.5, radius);
      expect(damageAtEdge).toBeCloseTo(0, 1);
    });

    it("should return 0 damage beyond radius", () => {
      const damage = calculateAoeDamage(100, 3.0, 2.5);
      expect(damage).toBe(0);
    });

    it("should use formula: max(0, 1 - distance/radius)", () => {
      const baseDamage = 100;
      const radius = 2.5;
      const distance = 1.0;

      const expectedFalloff = Math.max(0, 1 - distance / radius);
      const expectedDamage = baseDamage * expectedFalloff;

      const actualDamage = calculateAoeDamage(baseDamage, distance, radius);
      expect(actualDamage).toBeCloseTo(expectedDamage, 2);
    });
  });

  describe("applyRocketExplosion", () => {
    interface MockTarget {
      id: string;
      position: [number, number, number];
      health: number;
    }

    let targets: MockTarget[];
    let events: WeaponTelemetryEvent[];

    beforeEach(() => {
      events = [];
      targets = [
        { id: "target-1", position: [0, 0, 0], health: 100 },
        { id: "target-2", position: [1, 0, 0], health: 100 },
        { id: "target-3", position: [2, 0, 0], health: 100 },
        { id: "target-4", position: [5, 0, 0], health: 100 }, // Out of range
      ];
    });

    const recordEvent = (event: WeaponTelemetryEvent) => {
      events.push(event);
    };

    it("should emit explosion-aoe event", () => {
      const params: RocketExplosionParams = {
        origin: [0, 0, 0],
        radius: 2.5,
        baseDamage: 100,
        weaponProfileId: "rocket",
        ownerId: "robot-1",
        matchId: "match-1",
        timestampMs: 1000,
        targets,
        recordEvent,
      };

      applyRocketExplosion(params);

      const aoeEvents = events.filter((e) => e.type === "explosion-aoe");
      expect(aoeEvents).toHaveLength(1);
      expect(aoeEvents[0].weaponProfileId).toBe("rocket");
      expect(aoeEvents[0].aoeRadius).toBe(2.5);
    });

    it("should emit weapon-damage events for targets in range", () => {
      const params: RocketExplosionParams = {
        origin: [0, 0, 0],
        radius: 2.5,
        baseDamage: 100,
        weaponProfileId: "rocket",
        ownerId: "robot-1",
        matchId: "match-1",
        timestampMs: 1000,
        targets,
        recordEvent,
      };

      applyRocketExplosion(params);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      // Should hit targets 1, 2, 3 (within radius 2.5), not target 4
      expect(damageEvents).toHaveLength(3);

      // Verify no damage to out-of-range target
      const target4Events = damageEvents.filter(
        (e) => e.targetId === "target-4",
      );
      expect(target4Events).toHaveLength(0);
    });

    it("should sort damage events by targetId for determinism", () => {
      const params: RocketExplosionParams = {
        origin: [0, 0, 0],
        radius: 2.5,
        baseDamage: 100,
        weaponProfileId: "rocket",
        ownerId: "robot-1",
        matchId: "match-1",
        timestampMs: 1000,
        targets,
        recordEvent,
      };

      applyRocketExplosion(params);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");
      const targetIds = damageEvents.map((e) => e.targetId);

      // Should be sorted alphabetically
      const sortedIds = [...targetIds].sort();
      expect(targetIds).toEqual(sortedIds);
    });

    it("should apply correct damage amounts based on distance", () => {
      const params: RocketExplosionParams = {
        origin: [0, 0, 0],
        radius: 2.5,
        baseDamage: 100,
        weaponProfileId: "rocket",
        ownerId: "robot-1",
        matchId: "match-1",
        timestampMs: 1000,
        targets,
        recordEvent,
      };

      applyRocketExplosion(params);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      // Target 1 at distance 0 should take full damage
      const target1Event = damageEvents.find((e) => e.targetId === "target-1");
      expect(target1Event?.amount).toBe(100);

      // Target 2 at distance 1 should take ~60 damage (1 - 1/2.5 = 0.6)
      const target2Event = damageEvents.find((e) => e.targetId === "target-2");
      expect(target2Event?.amount).toBeCloseTo(60, 1);

      // Target 3 at distance 2 should take ~20 damage (1 - 2/2.5 = 0.2)
      const target3Event = damageEvents.find((e) => e.targetId === "target-3");
      expect(target3Event?.amount).toBeCloseTo(20, 1);
    });

    it("should include archetype in damage events", () => {
      const params: RocketExplosionParams = {
        origin: [0, 0, 0],
        radius: 2.5,
        baseDamage: 100,
        weaponProfileId: "rocket",
        ownerId: "robot-1",
        matchId: "match-1",
        timestampMs: 1000,
        targets,
        recordEvent,
      };

      applyRocketExplosion(params);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      damageEvents.forEach((event) => {
        expect(event.archetype).toBe("rocket");
      });
    });

    it("should include isAoE flag in damage events", () => {
      const params: RocketExplosionParams = {
        origin: [0, 0, 0],
        radius: 2.5,
        baseDamage: 100,
        weaponProfileId: "rocket",
        ownerId: "robot-1",
        matchId: "match-1",
        timestampMs: 1000,
        targets,
        recordEvent,
      };

      applyRocketExplosion(params);

      const damageEvents = events.filter((e) => e.type === "weapon-damage");

      damageEvents.forEach((event) => {
        expect(event.isAoE).toBe(true);
      });
    });
  });
});
