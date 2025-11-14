/**
 * WeaponProfile Tests
 * Task: T015
 * Spec: specs/005-weapon-diversity/spec.md
 */

import { describe, it, expect } from "vitest";
import {
  getWeaponProfile,
  getAllProfiles,
  WeaponProfileRegistry,
} from "../../src/lib/weapons/WeaponProfile";
import type { WeaponProfile } from "../../src/lib/weapons/types";

describe("WeaponProfile", () => {
  describe("getWeaponProfile", () => {
    it("should return gun profile with correct properties", () => {
      const gun = getWeaponProfile("gun");

      expect(gun).toBeDefined();
      expect(gun.id).toBe("gun");
      expect(gun.name).toBe("Machine Gun");
      expect(gun.archetype).toBe("gun");
      expect(gun.baseDamage).toBeGreaterThan(0);
      expect(gun.rateOfFire).toBeGreaterThan(0);
      expect(gun.projectileSpeed).toBeGreaterThan(0);
      expect(gun.visualRefs).toBeDefined();
      expect(gun.visualRefs.iconRef).toContain("gun");
    });

    it("should return laser profile with correct properties", () => {
      const laser = getWeaponProfile("laser");

      expect(laser).toBeDefined();
      expect(laser.id).toBe("laser");
      expect(laser.name).toBe("Pulse Laser");
      expect(laser.archetype).toBe("laser");
      expect(laser.baseDamage).toBeGreaterThan(0);
      expect(laser.beamDuration).toBeGreaterThan(0);
      expect(laser.tickRate).toBe(60);
      expect(laser.visualRefs.beamVfxRef).toBeDefined();
    });

    it("should return rocket profile with correct properties", () => {
      const rocket = getWeaponProfile("rocket");

      expect(rocket).toBeDefined();
      expect(rocket.id).toBe("rocket");
      expect(rocket.name).toBe("Rocket Launcher");
      expect(rocket.archetype).toBe("rocket");
      expect(rocket.baseDamage).toBeGreaterThan(0);
      expect(rocket.aoeRadius).toBe(2.5);
      expect(rocket.aoeFalloffProfile).toBe("linear");
      expect(rocket.visualRefs.trailVfxRef).toBeDefined();
    });

    it("should throw error for unknown weapon profile", () => {
      expect(() => getWeaponProfile("unknown")).toThrow(
        "Unknown weapon profile",
      );
    });
  });

  describe("getAllProfiles", () => {
    it("should return all three default profiles", () => {
      const profiles = getAllProfiles();

      expect(profiles).toHaveLength(3);
      expect(profiles.map((p) => p.id)).toEqual(
        expect.arrayContaining(["gun", "laser", "rocket"]),
      );
    });

    it("should return profiles with all required fields", () => {
      const profiles = getAllProfiles();

      profiles.forEach((profile) => {
        expect(profile.id).toBeDefined();
        expect(profile.name).toBeDefined();
        expect(profile.archetype).toBeDefined();
        expect(profile.baseDamage).toBeGreaterThan(0);
        expect(profile.rateOfFire).toBeGreaterThan(0);
        expect(profile.visualRefs).toBeDefined();
        expect(profile.tracerConfig).toBeDefined();
      });
    });
  });

  describe("WeaponProfileRegistry", () => {
    it("should allow registering custom weapon profiles", () => {
      const registry = new WeaponProfileRegistry();
      const customProfile: WeaponProfile = {
        id: "custom-gun",
        type: "gun",
        name: "Custom Gun",
        archetype: "gun",
        baseDamage: 20,
        rateOfFire: 2.0,
        ammoOrEnergy: 100,
        range: 26,
        projectileSpeed: 30,
        tracerConfig: {},
        visualRefs: {
          iconRef: "custom-gun-icon",
          modelRef: "custom-gun-model",
          firingSfxRef: "custom-gun-sfx",
          impactVfxRef: "custom-gun-impact",
        },
      };

      registry.register(customProfile);
      const retrieved = registry.get("custom-gun");

      expect(retrieved).toEqual(customProfile);
    });

    it("should throw error when registering duplicate profile ID", () => {
      const registry = new WeaponProfileRegistry();
      const profile: WeaponProfile = {
        id: "test-gun",
        type: "gun",
        name: "Test",
        archetype: "gun",
        baseDamage: 10,
        rateOfFire: 1,
        ammoOrEnergy: 50,
        range: 16,
        tracerConfig: {},
        visualRefs: {
          iconRef: "",
          modelRef: "",
          firingSfxRef: "",
          impactVfxRef: "",
        },
      };

      registry.register(profile);
      expect(() => registry.register(profile)).toThrow("already registered");
    });

    it("should list all registered profiles", () => {
      const registry = new WeaponProfileRegistry();
      const profiles = registry.listAll();

      // Should include default profiles
      expect(profiles.length).toBeGreaterThanOrEqual(3);
      expect(profiles.map((p) => p.id)).toContain("gun");
      expect(profiles.map((p) => p.id)).toContain("laser");
      expect(profiles.map((p) => p.id)).toContain("rocket");
    });
  });
});
