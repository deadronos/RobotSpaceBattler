import type { WeaponType } from "../../lib/weapons/types";
import { weaponRegistry } from "../../lib/weapons/WeaponProfile";
import { getArchetypeMultiplier } from "../balance/archetypeMultiplier";
import type { LegacyWeaponProfile } from "./weaponAdapter";

export type { LegacyWeaponProfile } from "./weaponAdapter";
export { getWeaponProfile } from "./weaponAdapter";

export function computeDamageMultiplier(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  const attackerProfile = weaponRegistry.get(attacker);
  const defenderProfile = weaponRegistry.get(defender);
  return getArchetypeMultiplier(
    attackerProfile.archetype,
    defenderProfile.archetype,
  );
}

export function computeProjectileLifetime(
  profile: LegacyWeaponProfile,
): number {
  return profile.range / Math.max(profile.projectileSpeed, 1);
}
