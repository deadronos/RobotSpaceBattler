import { vec3 } from "../../lib/math/vec3";
import type { ProjectileEntity } from "../worldTypes";
import { createGenericPool,GenericPool, GenericPoolStats } from "./poolUtils";

export type ProjectilePoolStats = GenericPoolStats;
export type ProjectilePool = GenericPool<ProjectileEntity>;

function createEmptyProjectile(): ProjectileEntity {
  return {
    id: "",
    kind: "projectile",
    team: "red",
    shooterId: "",
    weapon: "gun",
    position: vec3(),
    velocity: vec3(),
    damage: 0,
    maxLifetime: 0,
    spawnTime: 0,
    distanceTraveled: 0,
    maxDistance: 0,
    speed: 0,
    instanceIndex: undefined,
  };
}

function resetProjectile(projectile: ProjectileEntity): void {
  projectile.instanceIndex = undefined;
  projectile.id = "";
  projectile.team = "red";
  projectile.shooterId = "";
  projectile.weapon = "gun";
  projectile.targetId = undefined;
  projectile.projectileSize = undefined;
  projectile.projectileColor = undefined;
  projectile.trailColor = undefined;
  projectile.aoeRadius = undefined;
  projectile.explosionDurationMs = undefined;
  projectile.beamWidth = undefined;
  projectile.impactDurationMs = undefined;
  projectile.position = vec3();
  projectile.velocity = vec3();
  projectile.distanceTraveled = 0;
  projectile.spawnTime = 0;
  projectile.maxLifetime = 0;
  projectile.maxDistance = 0;
  projectile.speed = 0;
  projectile.damage = 0;
}

export function createProjectilePool(initialSize = 64): ProjectilePool {
  return createGenericPool<ProjectileEntity>(
    initialSize,
    createEmptyProjectile,
    resetProjectile,
  );
}
