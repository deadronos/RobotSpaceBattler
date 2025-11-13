/**
 * Weapon Profile Loader and Registry
 * Task: T015
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Provides weapon profile definitions and a registry for runtime access.
 * Default profiles are loaded on module import for immediate availability.
 */

import type { WeaponProfile } from "./types";

/**
 * Default weapon profiles (gun, laser, rocket)
 * These are the core weapons available in the game
 */
const DEFAULT_PROFILES: WeaponProfile[] = [
  {
    id: "gun",
    name: "Machine Gun",
    archetype: "gun",
    baseDamage: 16,
    rateOfFire: 1.4,
    ammoOrEnergy: 200,
    projectileSpeed: 26,
    tracerConfig: {
      color: "#ffaa00",
      width: 0.1,
      fadeTime: 0.15,
    },
    visualRefs: {
      iconRef: "/assets/vfx/weapon-placeholders/gun-placeholder.png",
      modelRef: "models/weapons/gun.glb",
      firingSfxRef: "audio/weapons/gun-fire.mp3",
      impactVfxRef: "/assets/vfx/weapon-placeholders/gun-placeholder.png",
    },
  },
  {
    id: "laser",
    name: "Pulse Laser",
    archetype: "laser",
    baseDamage: 14,
    rateOfFire: 1.8,
    ammoOrEnergy: 300,
    beamDuration: 0.5,
    tickRate: 60,
    tracerConfig: {
      color: "#00ff88",
      width: 0.15,
      intensity: 1.2,
    },
    visualRefs: {
      iconRef: "/assets/vfx/weapon-placeholders/laser-placeholder.png",
      modelRef: "models/weapons/laser.glb",
      firingSfxRef: "audio/weapons/laser-fire.mp3",
      impactVfxRef: "/assets/vfx/weapon-placeholders/laser-placeholder.png",
      beamVfxRef: "/assets/vfx/weapon-placeholders/laser-placeholder.png",
    },
  },
  {
    id: "rocket",
    name: "Rocket Launcher",
    archetype: "rocket",
    baseDamage: 24,
    rateOfFire: 0.9,
    ammoOrEnergy: 50,
    projectileSpeed: 22,
    aoeRadius: 2.5,
    aoeFalloffProfile: "linear",
    tracerConfig: {
      color: "#ff3300",
      trailLength: 2.0,
      particleCount: 15,
    },
    visualRefs: {
      iconRef: "/assets/vfx/weapon-placeholders/rocket-placeholder.png",
      modelRef: "models/weapons/rocket.glb",
      firingSfxRef: "audio/weapons/rocket-fire.mp3",
      impactVfxRef: "/assets/vfx/weapon-placeholders/rocket-placeholder.png",
      trailVfxRef: "/assets/vfx/weapon-placeholders/rocket-placeholder.png",
    },
  },
];

/**
 * In-memory registry for weapon profiles
 * Allows runtime registration of custom profiles for mods/testing
 */
export class WeaponProfileRegistry {
  private profiles: Map<string, WeaponProfile>;

  constructor() {
    this.profiles = new Map();
    // Load default profiles on instantiation
    DEFAULT_PROFILES.forEach((profile) => {
      this.profiles.set(profile.id, profile);
    });
  }

  /**
   * Register a new weapon profile
   * @throws Error if profile ID already exists
   */
  register(profile: WeaponProfile): void {
    if (this.profiles.has(profile.id)) {
      throw new Error(`Weapon profile '${profile.id}' is already registered`);
    }
    this.profiles.set(profile.id, profile);
  }

  /**
   * Get a weapon profile by ID
   * @throws Error if profile not found
   */
  get(id: string): WeaponProfile {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error(`Unknown weapon profile: ${id}`);
    }
    return profile;
  }

  /**
   * List all registered weapon profiles
   */
  listAll(): WeaponProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Check if a profile exists
   */
  has(id: string): boolean {
    return this.profiles.has(id);
  }
}

/**
 * Global registry instance for easy access throughout the application
 */
const globalRegistry = new WeaponProfileRegistry();

/**
 * Get a weapon profile by ID from the global registry
 * @throws Error if profile not found
 */
export function getWeaponProfile(id: string): WeaponProfile {
  return globalRegistry.get(id);
}

/**
 * Get all registered weapon profiles from the global registry
 */
export function getAllProfiles(): WeaponProfile[] {
  return globalRegistry.listAll();
}

/**
 * Export global registry for advanced use cases
 */
export const weaponRegistry = globalRegistry;
