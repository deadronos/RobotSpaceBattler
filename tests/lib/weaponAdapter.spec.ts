import { describe, expect, it } from "vitest";
import { weaponRegistry } from "../../src/lib/weapons/WeaponProfile";
import { getWeaponProfile } from "../../src/simulation/combat/weaponAdapter";
import type { WeaponType } from "../../src/lib/weapons/types";

const WEAPON_TYPES: WeaponType[] = ["laser", "gun", "rocket"];

describe("Weapon adapter", () => {
  it("returns parity for numeric stats", () => {
    WEAPON_TYPES.forEach((weapon) => {
      const legacy = getWeaponProfile(weapon);
      const registryProfile = weaponRegistry.get(weapon);

      expect(legacy.damage).toBe(registryProfile.baseDamage);
      expect(legacy.fireRate).toBe(registryProfile.rateOfFire);
      expect(legacy.range).toBe(registryProfile.range);
      expect(legacy.projectileSpeed).toBe(registryProfile.projectileSpeed ?? 0);
    });
  });

  it("provides visual references for each profile", () => {
    weaponRegistry.listAll().forEach((profile) => {
      expect(profile.visualRefs.firingSfxRef).toBeTruthy();
      expect(profile.visualRefs.impactVfxRef).toBeTruthy();
    });
  });
});
