/**
 * Canonical runtime Projectile component used by weapon systems and projectiles.
 *
 * This type is the single source of truth for runtime projectile payloads and is
 * used by systems (ProjectileSystem, HitscanSystem fallbacks, BeamSystem AoE,
 * FX, and damage application). The shape favors small, primitive fields and
 * uses string gameplay IDs for owner/source references.
 */

import { ensureGameplayId, normalizeTeam, type Team } from "../id";

export interface ProjectileComponent {
  sourceWeaponId: string;
  ownerId: string;
  damage: number;
  team: Team;
  ownerTeam?: Team;
  aoeRadius?: number;
  // lifespan in seconds
  lifespan: number;
  // spawn time in milliseconds (simNowMs)
  spawnTime: number;
  speed?: number;
  homing?: { turnSpeed: number; targetId?: number | string };
}

export interface ProjectileInit {
  sourceWeaponId: string | number;
  ownerId: string | number;
  team: string | number;
  ownerTeam?: string | number;
  damage: number;
  lifespan: number;
  spawnTime: number;
  speed?: number;
  aoeRadius?: number;
  homing?: { turnSpeed: number; targetId?: number | string };
}

export function createProjectileComponent(init: ProjectileInit): ProjectileComponent {
  return {
    sourceWeaponId: ensureGameplayId(init.sourceWeaponId),
    ownerId: ensureGameplayId(init.ownerId),
    team: normalizeTeam(init.team),
    ownerTeam: init.ownerTeam ? normalizeTeam(init.ownerTeam) : undefined,
    damage: init.damage,
    lifespan: init.lifespan,
    spawnTime: init.spawnTime,
    speed: init.speed,
    aoeRadius: init.aoeRadius,
    homing: init.homing,
  };
}
