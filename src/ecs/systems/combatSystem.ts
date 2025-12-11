import {
  addVec3,
  distanceVec3,
  normalizeVec3,
  scaleVec3,
  subtractVec3,
  vec3,
} from "../../lib/math/vec3";
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
  const direction = normalizeVec3(
    subtractVec3(target.position, shooter.position),
  );

  if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
    return null;
  }

  const velocity = scaleVec3(direction, profile.projectileSpeed);
  const maxLifetime =
    Math.max(1, profile.range / profile.projectileSpeed) * 1000;

  const projectile = world.pools.projectiles.acquire();

  projectile.id = createProjectileId(world);
  projectile.kind = "projectile";
  projectile.team = shooter.team;
  projectile.shooterId = shooter.id;
  projectile.weapon = shooter.weapon;
  projectile.position = addVec3(shooter.position, vec3(0, 0.8, 0));
  projectile.velocity = velocity;
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
