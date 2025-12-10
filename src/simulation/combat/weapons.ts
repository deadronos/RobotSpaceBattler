import { WeaponType } from "../../ecs/world";

/**
 * Configuration profile for a weapon type.
 */
export interface WeaponProfile {
  /** The type of weapon. */
  type: WeaponType;
  /** Base damage per hit. */
  damage: number;
  /** Shots per second. */
  fireRate: number;
  /** Speed of the projectile in units per second. */
  projectileSpeed: number;
  /** Maximum range in units. */
  range: number;
  /** Visual size of the projectile. */
  projectileSize: number;
  /** Color of the projectile. */
  projectileColor: string;
  /** Color of the trail effect (optional). */
  trailColor?: string;
  /** Radius of area-of-effect damage (optional). */
  aoeRadius?: number;
  /** Duration of explosion visual effect (optional). */
  explosionDurationMs?: number;
  /** Width of the beam visual (for lasers). */
  beamWidth?: number;
  /** Duration of impact visual effect. */
  impactDurationMs?: number;
}

const WEAPON_PROFILES: Record<WeaponType, WeaponProfile> = {
  laser: {
    type: "laser",
    damage: 14,
    fireRate: 1.8,
    projectileSpeed: 32,
    range: 28,
    projectileSize: 0.18,
    projectileColor: "#7fffd4",
    beamWidth: 0.08,
    impactDurationMs: 280,
  },
  gun: {
    type: "gun",
    damage: 16,
    fireRate: 1.4,
    projectileSpeed: 26,
    range: 24,
    projectileSize: 0.14,
    projectileColor: "#ffe08a",
    impactDurationMs: 220,
  },
  rocket: {
    type: "rocket",
    damage: 24,
    fireRate: 0.9,
    projectileSpeed: 22,
    range: 34,
    projectileSize: 0.32,
    projectileColor: "#ff9d5c",
    trailColor: "#ffbe76",
    aoeRadius: 2.5,
    explosionDurationMs: 720,
    impactDurationMs: 360,
  },
};

const DAMAGE_MATRIX: Record<WeaponType, Record<WeaponType, number>> = {
  laser: {
    laser: 1,
    gun: 1.25,
    rocket: 0.85,
  },
  gun: {
    laser: 0.85,
    gun: 1,
    rocket: 1.25,
  },
  rocket: {
    laser: 1.25,
    gun: 0.85,
    rocket: 1,
  },
};

/**
 * Retrieves the profile for a specific weapon type.
 * @param type - The weapon type.
 * @returns The WeaponProfile.
 */
export function getWeaponProfile(type: WeaponType): WeaponProfile {
  return WEAPON_PROFILES[type];
}

/**
 * Calculates the damage multiplier based on the rock-paper-scissors mechanic.
 * Laser > Gun > Rocket > Laser.
 *
 * @param attacker - The attacking weapon type.
 * @param defender - The defending weapon type.
 * @returns The damage multiplier.
 */
export function computeDamageMultiplier(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  return DAMAGE_MATRIX[attacker][defender];
}

/**
 * Computes the maximum lifetime of a projectile based on its range and speed.
 * @param profile - The weapon profile.
 * @returns Lifetime in seconds.
 */
export function computeProjectileLifetime(profile: WeaponProfile): number {
  return profile.range / profile.projectileSpeed;
}
