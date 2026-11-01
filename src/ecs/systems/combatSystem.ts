import { distanceVec3 } from "../../lib/math/vec3";
import { TelemetryPort } from "../../runtime/simulation/ports";
import { getWeaponProfile } from "../../simulation/combat/weapons";
import { BattleWorld, ProjectileEntity, RobotEntity } from "../world";

const robotsByIdScratch = new Map<string, RobotEntity>();

function createProjectileId(world: BattleWorld): string {
  const id = `projectile-${world.state.nextProjectileId}`;
  world.state.nextProjectileId += 1;
  return id;
}

/**
 * Creates a new projectile entity based on the shooter's weapon and target.
 * @param shooter - The robot firing the weapon.
 * @param target - The target robot.
 * @param world - The battle world.
 * @returns A new ProjectileEntity, or null if the projectile could not be created.
 */
function createProjectile(
  shooter: RobotEntity,
  target: RobotEntity,
  world: BattleWorld,
): ProjectileEntity | null {
  if (target.health <= 0) {
    return null;
  }

  const profile = getWeaponProfile(shooter.weapon);
  // Direction is computed with scalars (same arithmetic as normalizeVec3 +
  // scaleVec3) so a shot does not allocate intermediate vectors.
  const dx = target.position.x - shooter.position.x;
  const dy = target.position.y - shooter.position.y;
  const dz = target.position.z - shooter.position.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (length === 0) {
    return null;
  }
  const inverseLength = 1 / length;
  const dirX = dx * inverseLength;
  const dirY = dy * inverseLength;
  const dirZ = dz * inverseLength;

  const maxLifetime =
    Math.max(1, profile.range / profile.projectileSpeed) * 1000;

  const projectile = world.pools.projectiles.acquire();

  projectile.id = createProjectileId(world);
  projectile.kind = "projectile";
  projectile.team = shooter.team;
  projectile.shooterId = shooter.id;
  projectile.weapon = shooter.weapon;
  // Pooled projectiles own their vectors; fill them in place.
  projectile.position.x = shooter.position.x + 0;
  projectile.position.y = shooter.position.y + 0.8;
  projectile.position.z = shooter.position.z + 0;
  projectile.velocity.x = dirX * profile.projectileSpeed;
  projectile.velocity.y = dirY * profile.projectileSpeed;
  projectile.velocity.z = dirZ * profile.projectileSpeed;
  projectile.damage = profile.damage;
  projectile.maxLifetime = maxLifetime;
  projectile.spawnTime = world.state.elapsedMs;
  projectile.distanceTraveled = 0;
  projectile.maxDistance = profile.range;
  projectile.speed = profile.projectileSpeed;
  projectile.targetId = target.id;
  projectile.projectileSize = profile.projectileSize;
  projectile.projectileColor = profile.projectileColor;
  projectile.trailColor = profile.trailColor;
  projectile.aoeRadius = profile.aoeRadius;
  projectile.explosionDurationMs = profile.explosionDurationMs;
  projectile.beamWidth = profile.beamWidth;
  projectile.impactDurationMs = profile.impactDurationMs;
  projectile.instanceIndex = undefined;

  return projectile;
}

/**
 * Updates the combat logic for the battle.
 * Handles weapon firing, cooldowns, and projectile creation.
 *
 * @param world - The battle world state.
 * @param telemetry - Port for recording telemetry events (e.g., shots fired).
 */
export function updateCombatSystem(
  world: BattleWorld,
  telemetry: TelemetryPort,
  deltaSeconds: number,
): void {
  const robots = world.robots.entities;
  if (robots.length === 0) {
    return;
  }

  robotsByIdScratch.clear();
  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    robotsByIdScratch.set(robot.id, robot);
  }

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    robot.fireCooldown = Math.max(0, robot.fireCooldown - deltaSeconds);

    if (robot.health <= 0) {
      continue;
    }

    if (robot.fireCooldown > 0 || robot.ai.mode === "retreat") {
      continue;
    }

    const target = robot.ai.targetId
      ? robotsByIdScratch.get(robot.ai.targetId)
      : undefined;
    if (!target || target.health <= 0) {
      continue;
    }

    const profile = getWeaponProfile(robot.weapon);
    const distance = distanceVec3(robot.position, target.position);
    if (distance > profile.range) {
      continue;
    }

    const projectile = createProjectile(robot, target, world);
    if (!projectile) {
      continue;
    }

    world.addProjectile(projectile);
    robot.fireCooldown = 1 / profile.fireRate;

    telemetry.recordFire({
      timestampMs: world.state.elapsedMs,
      entityId: robot.id,
      teamId: robot.team,
      weapon: robot.weapon,
    });
  }
}
