import type { WeaponType } from "../../types";
import { createProjectile, type Projectile } from "../entities/Projectile";
import type { Robot } from "../entities/Robot";
import {
  calculateWeaponDamage,
  getDamageMultiplier,
  getWeaponConfig,
} from "../entities/Weapon";
import { spawnProjectileBody } from "../simulation/physics";
import type { WorldView } from "../simulation/worldTypes";
import {
  cloneVector,
  distance,
  normalize,
  scaleVector,
  subtractVectors,
} from "../utils/vector";

const PROJECTILE_LIFETIME_SECONDS = 5;

export { getDamageMultiplier };

export function getWeaponData(weapon: WeaponType) {
  return getWeaponConfig(weapon);
}

export function calculateDamage(
  attacker: WeaponType,
  defender: WeaponType,
): number {
  return calculateWeaponDamage(attacker, defender);
}

function createProjectileId(
  ownerId: string,
  now: number,
  suffix: number,
): string {
  return `${ownerId}-projectile-${now.toFixed(3)}-${suffix}`;
}

function getTarget(
  world: WorldView,
  targetId: string | null,
): Robot | undefined {
  if (!targetId) {
    return undefined;
  }

  return world.entities.find(
    (entity) => entity.id === targetId && entity.health > 0,
  );
}

function isTargetValid(
  shooter: Robot,
  target: Robot | undefined,
): target is Robot {
  return Boolean(target && target.team !== shooter.team && target.health > 0);
}

function createShotProjectile({
  shooter,
  target,
  now,
  range,
}: {
  shooter: Robot;
  target: Robot;
  now: number;
  range: number;
}): Projectile | null {
  const weaponConfig = getWeaponConfig(shooter.weaponType);
  const distanceToTarget = distance(shooter.position, target.position);
  if (distanceToTarget > range) {
    return null;
  }

  const direction = normalize(
    subtractVectors(target.position, shooter.position),
  );
  const velocity = scaleVector(direction, weaponConfig.projectileSpeed);

  return createProjectile({
    id: createProjectileId(shooter.id, now, shooter.stats.shotsFired + 1),
    ownerId: shooter.id,
    weaponType: shooter.weaponType,
    position: cloneVector(shooter.position),
    velocity,
    damage: calculateWeaponDamage(shooter.weaponType, target.weaponType),
    distanceTraveled: 0,
    maxDistance: weaponConfig.effectiveRange * 2,
    spawnTime: now,
    maxLifetime: PROJECTILE_LIFETIME_SECONDS,
  });
}

function canFire(shooter: Robot, now: number): boolean {
  const weaponConfig = getWeaponConfig(shooter.weaponType);
  if (shooter.health <= 0) {
    return false;
  }
  if (now - shooter.aiState.lastFireTime < weaponConfig.fireRate) {
    return false;
  }

  return true;
}

function recordProjectile(world: WorldView, projectile: Projectile): void {
  world.projectiles.push(projectile);
  world.ecs?.projectiles.add(projectile);
  spawnProjectileBody(world.physics, projectile);
}

export function runWeaponSystem(world: WorldView): void {
  const now = world.simulation.simulationTime;
  const aliveRobots = world.entities.filter((entity) => entity.health > 0);

  aliveRobots.forEach((shooter) => {
    const target = getTarget(world, shooter.aiState.targetId);
    if (!isTargetValid(shooter, target)) {
      return;
    }

    if (!canFire(shooter, now)) {
      return;
    }

    const projectile = createShotProjectile({
      shooter,
      target,
      now,
      range: getWeaponConfig(shooter.weaponType).effectiveRange,
    });

    if (!projectile) {
      return;
    }

    recordProjectile(world, projectile);
    shooter.stats.shotsFired += 1;
    shooter.aiState.lastFireTime = now;
  });
}
