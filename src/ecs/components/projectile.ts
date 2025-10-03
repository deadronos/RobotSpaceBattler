/**
 * Deterministic Projectile component schema.
 */

import { ensureGameplayId, normalizeTeam, type Team } from "../id";

export interface ProjectileComponent {
  id: string;
  ownerId: string;
  ownerTeam: Team;
  team: Team;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  lifespanMs: number;
  spawnedAtMs: number;
  aoeRadius?: number;
  damage: number;
}

export interface ProjectileInit {
  id: string | number;
  ownerId: string | number;
  ownerTeam: string | number;
  team: string | number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  lifespanMs: number;
  spawnedAtMs: number;
  damage: number;
  aoeRadius?: number;
}

export function createProjectileComponent(init: ProjectileInit): ProjectileComponent {
  return {
    id: ensureGameplayId(init.id),
    ownerId: ensureGameplayId(init.ownerId),
    ownerTeam: normalizeTeam(init.ownerTeam),
    team: normalizeTeam(init.team),
    position: { ...init.position },
    velocity: { ...init.velocity },
    lifespanMs: init.lifespanMs,
    spawnedAtMs: init.spawnedAtMs,
    damage: init.damage,
    aoeRadius: init.aoeRadius,
  };
}
