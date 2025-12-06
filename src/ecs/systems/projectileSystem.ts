import { applyCaptaincy } from '../../lib/captainElection';
import {
  addInPlaceVec3,
  cloneVec3,
  distanceSquaredVec3,
  distanceVec3,
  scaleVec3To,
  vec3,
} from '../../lib/math/vec3';
import { perfMarkEnd, perfMarkStart } from '../../lib/perf';
import { isActiveRobot } from '../../lib/robotHelpers';
import { TelemetryPort } from '../../runtime/simulation/ports';
import { computeDamageMultiplier } from '../../simulation/combat/weapons';
import { BattleWorld, EffectType, ProjectileEntity, RobotEntity } from '../world';

const activeRobotsScratch: RobotEntity[] = [];
const robotsByIdScratch = new Map<string, RobotEntity>();

function findTarget(
  projectile: ProjectileEntity,
  activeRobots: RobotEntity[],
  robotsById: Map<string, RobotEntity>,
): RobotEntity | undefined {
  const direct = projectile.targetId ? robotsById.get(projectile.targetId) : undefined;

  if (direct && direct.team !== projectile.team && isActiveRobot(direct)) {
    return direct;
  }

  let best: RobotEntity | undefined;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (let i = 0; i < activeRobots.length; i += 1) {
    const candidate = activeRobots[i];
    if (candidate.team === projectile.team) {
      continue;
    }

    const distanceSq = distanceSquaredVec3(candidate.position, projectile.position);
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      best = candidate;
    }
  }

  return best;
}

function spawnEffect(
  world: BattleWorld,
  projectile: ProjectileEntity,
  effectType: EffectType,
  radius: number,
  color: string,
  durationMs: number,
  secondaryColor?: string,
): void {
  if (radius <= 0 || durationMs <= 0) {
    return;
  }

  const id = `effect-${world.state.nextEffectId}`;
  world.state.nextEffectId += 1;

  const effect = world.pools.effects.acquire();
  effect.id = id;
  effect.kind = 'effect';
  effect.effectType = effectType;
  effect.position = cloneVec3(projectile.position);
  effect.radius = radius;
  effect.color = color;
  effect.secondaryColor = secondaryColor;
  effect.createdAt = world.state.elapsedMs;
  effect.duration = durationMs;
  effect.instanceIndex = undefined;

  world.addEffect(effect);
}

function applyDamageToRobot(
  world: BattleWorld,
  projectile: ProjectileEntity,
  target: RobotEntity,
  shooter: RobotEntity | undefined,
  baseDamage: number,
  telemetry: TelemetryPort,
): void {
  if (target.health <= 0 || baseDamage <= 0) {
    return;
  }

  const multiplier = computeDamageMultiplier(projectile.weapon, target.weapon);
  const damage = baseDamage * multiplier;
  if (damage <= 0) {
    return;
  }

  target.health = Math.max(0, target.health - damage);
  target.lastDamageTimestamp = world.state.elapsedMs;

  telemetry.recordDamage({
    timestampMs: world.state.elapsedMs,
    attackerId: shooter?.id ?? projectile.shooterId,
    targetId: target.id,
    teamId: shooter?.team ?? projectile.team,
    amount: damage,
  });

  if (target.health <= 0) {
    if (shooter) {
      shooter.kills += 1;
    }

    telemetry.recordDeath({
      timestampMs: world.state.elapsedMs,
      entityId: target.id,
      teamId: target.team,
      attackerId: shooter?.id,
    });

    world.world.remove(target);
    applyCaptaincy(target.team, world.getRobotsByTeam(target.team));
  }
}

function applyDirectHit(
  world: BattleWorld,
  projectile: ProjectileEntity,
  target: RobotEntity,
  shooter: RobotEntity | undefined,
  telemetry: TelemetryPort,
): void {
  applyDamageToRobot(world, projectile, target, shooter, projectile.damage, telemetry);

  const effectRadius = projectile.projectileSize
    ? projectile.projectileSize * (projectile.weapon === 'laser' ? 2.4 : 1.6)
    : 0.45;
  const duration = projectile.impactDurationMs ?? 240;
  const secondaryColor = projectile.weapon === 'laser' ? '#b9fdfd' : '#fff3c4';
  const effectType: EffectType = projectile.weapon === 'laser' ? 'laser-impact' : 'impact';

  spawnEffect(
    world,
    projectile,
    effectType,
    effectRadius,
    projectile.projectileColor ?? '#ffffff',
    duration,
    secondaryColor,
  );

  world.removeProjectile(projectile);
}

function applyRocketExplosion(
  world: BattleWorld,
  projectile: ProjectileEntity,
  shooter: RobotEntity | undefined,
  telemetry: TelemetryPort,
  directTarget: RobotEntity | undefined,
  activeRobots: RobotEntity[],
): void {
  const radius = projectile.aoeRadius ?? 0;
  if (radius <= 0 || !directTarget) {
    if (directTarget) {
      applyDirectHit(world, projectile, directTarget, shooter, telemetry);
    } else {
      world.removeProjectile(projectile);
    }
    return;
  }

  for (let i = 0; i < activeRobots.length; i += 1) {
    const robot = activeRobots[i];
    if (robot.team === projectile.team) {
      continue;
    }

    const distance = distanceVec3(robot.position, projectile.position);
    if (distance > radius) {
      continue;
    }

    const falloff = Math.max(0, 1 - distance / radius);
    const baseDamage = projectile.damage * falloff;
    applyDamageToRobot(world, projectile, robot, shooter, baseDamage, telemetry);
  }

  const duration = projectile.explosionDurationMs ?? 720;
  const secondaryColor = projectile.trailColor ?? '#ffd7a1';
  spawnEffect(
    world,
    projectile,
    'explosion',
    Math.max(radius, projectile.projectileSize ? projectile.projectileSize * 4 : radius),
    projectile.projectileColor ?? '#ff9d5c',
    duration,
    secondaryColor,
  );

  world.removeProjectile(projectile);
}

/**
 * Updates the projectile simulation.
 * Handles projectile movement, collision detection, and damage application.
 *
 * @param world - The battle world.
 * @param deltaSeconds - Time elapsed since last update in seconds.
 * @param telemetry - Port for recording telemetry events.
 */
export function updateProjectileSystem(
  world: BattleWorld,
  deltaSeconds: number,
  telemetry: TelemetryPort,
): void {
  perfMarkStart('updateProjectileSystem');

  const robots = world.robots.entities;
  activeRobotsScratch.length = 0;
  robotsByIdScratch.clear();

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    robotsByIdScratch.set(robot.id, robot);
    if (isActiveRobot(robot)) {
      activeRobotsScratch.push(robot);
    }
  }

  const projectiles = world.projectiles.entities;
  const displacement = vec3();

  for (let i = 0; i < projectiles.length; i += 1) {
    const projectile = projectiles[i];
    scaleVec3To(displacement, projectile.velocity, deltaSeconds);
    addInPlaceVec3(projectile.position, displacement);
    projectile.distanceTraveled += projectile.speed * deltaSeconds;

    const ageMs = world.state.elapsedMs - projectile.spawnTime;
    if (
      projectile.distanceTraveled >= projectile.maxDistance ||
      ageMs >= projectile.maxLifetime
    ) {
      world.removeProjectile(projectile);
      continue;
    }

    const target = findTarget(projectile, activeRobotsScratch, robotsByIdScratch);
    if (!target) {
      continue;
    }

    const hitRadius = 1.2;
    const distance = distanceVec3(projectile.position, target.position);
    if (distance <= hitRadius) {
      const shooter = robotsByIdScratch.get(projectile.shooterId);

      if (projectile.weapon === 'rocket') {
        applyRocketExplosion(world, projectile, shooter, telemetry, target, activeRobotsScratch);
      } else {
        applyDirectHit(world, projectile, target, shooter, telemetry);
      }
    }
  }

  perfMarkEnd('updateProjectileSystem');
}
