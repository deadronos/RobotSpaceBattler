/**
 * Weapon Diversity Feature - Type Definitions
 * Spec: specs/005-weapon-diversity/spec.md
 * Data Model: specs/005-weapon-diversity/data-model.md
 */

/**
 * Weapon archetype enum for rock-paper-scissors balance
 * Laser > Gun, Gun > Rocket, Rocket > Laser
 */
export type WeaponArchetype = "gun" | "laser" | "rocket";

/**
 * Weapon profile defines static properties of a weapon type
 */
export interface WeaponProfile {
  id: string;
  name: string;
  archetype: WeaponArchetype;
  baseDamage: number;
  rateOfFire: number;
  ammoOrEnergy: number;
  projectileSpeed?: number; // For guns and rockets
  aoeRadius?: number; // Rocket only
  aoeFalloffProfile?: string; // Rocket only
  beamDuration?: number; // Laser only
  tickRate?: number; // Laser only (default 60 Hz)
  tracerConfig: Record<string, unknown>;
  visualRefs: WeaponVisual;
}

/**
 * Balance multipliers for rock-paper-scissors damage calculations
 * Applied multiplicatively to baseDamage before resistances
 */
export interface BalanceMultipliers {
  advantageMultiplier: number; // Default 1.25 (+25% damage)
  disadvantageMultiplier: number; // Default 0.85 (-15% damage)
  neutralMultiplier: number; // Default 1.0 (no change)
}

/**
 * Projectile instance in the simulation
 */
export interface ProjectileInstance {
  id: string;
  weaponProfileId: string;
  ownerId: string;
  position: [number, number, number];
  velocity: [number, number, number];
  timestampMs: number;
  contactEventId?: string;
}

/**
 * Explosion event for rocket AoE damage
 */
export interface ExplosionEvent {
  id: string;
  origin: [number, number, number];
  radius: number;
  timestampMs: number;
  damageProfileId: string;
}

/**
 * Visual asset references for a weapon
 */
export interface WeaponVisual {
  iconRef: string;
  modelRef: string;
  firingSfxRef: string;
  impactVfxRef: string;
  beamVfxRef?: string; // Laser only
  trailVfxRef?: string; // Rockets
}

/**
 * Telemetry event types for weapon actions
 */
export type WeaponTelemetryEventType =
  | "pickup-acquired"
  | "weapon-fired"
  | "weapon-hit"
  | "explosion-aoe"
  | "weapon-damage";

/**
 * Telemetry event for weapon actions
 */
export interface WeaponTelemetryEvent {
  type: WeaponTelemetryEventType;
  matchId: string;
  weaponProfileId: string;
  attackerId?: string;
  targetId?: string;
  amount?: number;
  timestampMs: number; // Integer milliseconds since match start
  frameIndex?: number; // Optional for deterministic ordering
  archetype?: WeaponArchetype;
  isAoE?: boolean;
  aoeRadius?: number;
  sequenceId?: string;
}

/**
 * In-memory telemetry aggregator for test harness and live runs
 */
export interface TelemetryAggregator {
  matchId: string;
  eventCountsByType: Record<WeaponTelemetryEventType, number>;
  damageTotalsByWeapon: Record<string, number>;
  winCountsByArchetype: Record<WeaponArchetype, number>;
  timestampMs: number; // Summary window timestamp
}

/**
 * Default balance multipliers per spec
 */
export const DEFAULT_BALANCE_MULTIPLIERS: BalanceMultipliers = {
  advantageMultiplier: 1.25,
  disadvantageMultiplier: 0.85,
  neutralMultiplier: 1.0,
};

/**
 * Rock-paper-scissors advantage lookup
 * Returns the multiplier to apply based on attacker/defender archetype
 */
export function getArchetypeAdvantage(
  attacker: WeaponArchetype,
  defender: WeaponArchetype,
): "advantage" | "disadvantage" | "neutral" {
  // Laser > Gun
  if (attacker === "laser" && defender === "gun") return "advantage";
  if (attacker === "gun" && defender === "laser") return "disadvantage";

  // Gun > Rocket
  if (attacker === "gun" && defender === "rocket") return "advantage";
  if (attacker === "rocket" && defender === "gun") return "disadvantage";

  // Rocket > Laser
  if (attacker === "rocket" && defender === "laser") return "advantage";
  if (attacker === "laser" && defender === "rocket") return "disadvantage";

  return "neutral";
}
