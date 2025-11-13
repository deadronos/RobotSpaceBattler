/**
 * Rocket AoE Implementation
 * Task: T017
 * Spec: specs/005-weapon-diversity/spec.md
 *
 * Implements area-of-effect damage for rocket projectiles with linear falloff.
 * Formula: damage = baseDamage * max(0, 1 - distance/radius)
 */

import type { WeaponTelemetryEvent } from "../../lib/weapons/types";

/**
 * Target interface for AoE damage calculation
 */
export interface AoETarget {
  id: string;
  position: [number, number, number];
  health?: number;
}

/**
 * Parameters for rocket explosion
 */
export interface RocketExplosionParams {
  origin: [number, number, number];
  radius: number;
  baseDamage: number;
  weaponProfileId: string;
  ownerId: string;
  matchId: string;
  timestampMs: number;
  targets: AoETarget[];
  recordEvent: (event: WeaponTelemetryEvent) => void;
}

/**
 * Calculate 3D distance between two points
 */
function calculateDistance(
  pos1: [number, number, number],
  pos2: [number, number, number],
): number {
  const dx = pos2[0] - pos1[0];
  const dy = pos2[1] - pos1[1];
  const dz = pos2[2] - pos1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate AoE damage with linear falloff
 * Formula: baseDamage * max(0, 1 - distance/radius)
 *
 * @param baseDamage - Base damage at center of explosion
 * @param distance - Distance from explosion center
 * @param radius - AoE radius (2.5 for rockets)
 * @returns Damage amount after falloff
 */
export function calculateAoeDamage(
  baseDamage: number,
  distance: number,
  radius: number,
): number {
  if (distance > radius) {
    return 0;
  }

  const falloff = Math.max(0, 1 - distance / radius);
  return baseDamage * falloff;
}

/**
 * Apply rocket explosion with AoE damage
 * Emits telemetry events for explosion and damage to each target
 *
 * Events are emitted in deterministic order (sorted by targetId)
 *
 * @param params - Explosion parameters
 */
export function applyRocketExplosion(params: RocketExplosionParams): void {
  const {
    origin,
    radius,
    baseDamage,
    weaponProfileId,
    ownerId,
    matchId,
    timestampMs,
    targets,
    recordEvent,
  } = params;

  // Emit explosion-aoe event
  recordEvent({
    type: "explosion-aoe",
    matchId,
    weaponProfileId,
    attackerId: ownerId,
    timestampMs,
    archetype: "rocket",
    isAoE: true,
    aoeRadius: radius,
  });

  // Calculate damage for each target in range
  const damageResults: Array<{
    targetId: string;
    damage: number;
  }> = [];

  targets.forEach((target) => {
    const distance = calculateDistance(origin, target.position);

    if (distance <= radius) {
      const damage = calculateAoeDamage(baseDamage, distance, radius);
      damageResults.push({
        targetId: target.id,
        damage,
      });
    }
  });

  // Sort by targetId for deterministic event ordering
  damageResults.sort((a, b) => a.targetId.localeCompare(b.targetId));

  // Emit weapon-damage events in sorted order
  damageResults.forEach(({ targetId, damage }) => {
    recordEvent({
      type: "weapon-damage",
      matchId,
      weaponProfileId,
      attackerId: ownerId,
      targetId,
      amount: damage,
      timestampMs,
      archetype: "rocket",
      isAoE: true,
    });
  });
}
