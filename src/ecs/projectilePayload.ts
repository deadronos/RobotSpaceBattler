import { ensureGameplayId, normalizeTeam } from "./id";
import { createProjectileComponent } from "./components/projectile";
import type { ProjectileComponent, ProjectileInit } from "./components/projectile";

export interface PersistedProjectile {
  // ids may be numeric in older persisted forms; allow both and normalize on load
  sourceWeaponId?: string | number;
  ownerId?: string | number;
  team?: string | number;
  ownerTeam?: string | number;
  damage?: number;
  aoeRadius?: number;
  lifespan?: number;
  speed?: number;
  homing?: { turnSpeed?: number; targetId?: string | number } | undefined;
  // spawnTime is a runtime timestamp and intentionally omitted from persisted form
}

export function toPersistedProjectile(
  projectile: ProjectileComponent | Record<string, unknown>,
): PersistedProjectile {
  // Only persist fields that are safe and relevant for re-creating a projectile
  const out: PersistedProjectile = {};

  if (projectile.sourceWeaponId) out.sourceWeaponId = ensureGameplayId(projectile.sourceWeaponId as unknown);
  if (projectile.ownerId) out.ownerId = ensureGameplayId(projectile.ownerId as unknown);
  if (projectile.team) out.team = normalizeTeam(projectile.team as unknown);
  if (projectile.ownerTeam) out.ownerTeam = normalizeTeam(projectile.ownerTeam as unknown);
  if (typeof projectile.damage === "number") out.damage = projectile.damage;
  if (typeof projectile.aoeRadius === "number") out.aoeRadius = projectile.aoeRadius;
  if (typeof projectile.lifespan === "number") out.lifespan = projectile.lifespan;
  if (typeof projectile.speed === "number") out.speed = projectile.speed;
  if (projectile.homing) {
    out.homing = {
      turnSpeed: (projectile.homing as unknown as { turnSpeed?: number }).turnSpeed,
      targetId: (projectile.homing as unknown as { targetId?: string | number }).targetId,
    };
  }

  return out;
}

export function fromPersistedProjectile(
  persisted: PersistedProjectile,
  opts: { spawnTime: number; defaultLifespan?: number; idFactory?: () => string } ,
): ProjectileComponent {
  const init: ProjectileInit = {
    sourceWeaponId: persisted.sourceWeaponId ?? (opts.idFactory ? opts.idFactory() : "-1"),
    ownerId: persisted.ownerId ?? "-1",
    team: persisted.team ?? "neutral",
    ownerTeam: persisted.ownerTeam,
    damage: persisted.damage ?? 0,
    lifespan: persisted.lifespan ?? opts.defaultLifespan ?? 5,
    spawnTime: opts.spawnTime,
    speed: persisted.speed,
    aoeRadius: persisted.aoeRadius,
    homing: persisted.homing
      ? { turnSpeed: persisted.homing.turnSpeed ?? 1, targetId: persisted.homing.targetId }
      : undefined,
  };

  // createProjectileComponent will normalize ids and teams for runtime use
  return createProjectileComponent(init);
}

export function validatePersistedProjectile(p: PersistedProjectile) {
  if (p.damage !== undefined && typeof p.damage !== "number") throw new Error("PersistedProjectile.damage must be a number if present");
  if (p.lifespan !== undefined && typeof p.lifespan !== "number") throw new Error("PersistedProjectile.lifespan must be a number if present");
}