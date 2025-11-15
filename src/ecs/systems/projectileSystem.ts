import { applyCaptaincy } from '../../lib/captainElection';
import { addInPlaceVec3, cloneVec3, distanceVec3, scaleVec3 } from '../../lib/math/vec3';
import { isActiveRobot } from '../../lib/robotHelpers';
import { TelemetryPort } from '../../runtime/simulation/ports';
import { computeDamageMultiplier } from '../../simulation/combat/weapons';
import { BattleWorld, EffectType, ProjectileEntity, RobotEntity } from '../world';

function findTarget(
  world: BattleWorld,
  projectile: ProjectileEntity,
): RobotEntity | undefined {
  const robots = world.robots.entities;
  const direct = projectile.targetId
    ? robots.find((robot) => robot.id === projectile.targetId)
    : undefined;

  if (direct && isActiveRobot(direct)) {
    return direct;
  }

  return robots
    .filter((robot) => robot.team !== projectile.team && isActiveRobot(robot))
    .sort((a, b) => {
      const da = distanceVec3(a.position, projectile.position);
      const db = distanceVec3(b.position, projectile.position);
      return da - db;
    })[0];
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

  world.world.add({
    id,
    kind: 'effect',
    effectType,
    position: cloneVec3(projectile.position),
    radius,
    color,
    secondaryColor,
    createdAt: world.state.elapsedMs,
    duration: durationMs,
  });
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

  world.world.remove(projectile);
}

function applyRocketExplosion(
  world: BattleWorld,
  projectile: ProjectileEntity,
  shooter: RobotEntity | undefined,
  telemetry: TelemetryPort,
  directTarget: RobotEntity | undefined,
): void {
  const radius = projectile.aoeRadius ?? 0;
  if (radius <= 0 || !directTarget) {
    if (directTarget) {
      applyDirectHit(world, projectile, directTarget, shooter, telemetry);
    } else {
      world.world.remove(projectile);
    }
    return;
  }

  const impacted = world.robots.entities
    .filter((robot) => robot.team !== projectile.team && isActiveRobot(robot))
    .map((robot) => ({ robot, distance: distanceVec3(robot.position, projectile.position) }))
    .filter(({ distance }) => distance <= radius)
    .sort((a, b) => a.robot.id.localeCompare(b.robot.id));

  impacted.forEach(({ robot, distance }) => {
    const falloff = Math.max(0, 1 - distance / radius);
    const baseDamage = projectile.damage * falloff;
    applyDamageToRobot(world, projectile, robot, shooter, baseDamage, telemetry);
  });

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

  world.world.remove(projectile);
}

export function updateProjectileSystem(
  world: BattleWorld,
  deltaSeconds: number,
  telemetry: TelemetryPort,
): void {
  const projectiles = [...world.projectiles.entities];

  projectiles.forEach((projectile) => {
    const displacement = scaleVec3(projectile.velocity, deltaSeconds);
    addInPlaceVec3(projectile.position, displacement);
    projectile.distanceTraveled += projectile.speed * deltaSeconds;

    const ageMs = world.state.elapsedMs - projectile.spawnTime;
    if (
      projectile.distanceTraveled >= projectile.maxDistance ||
      ageMs >= projectile.maxLifetime
    ) {
      world.world.remove(projectile);
      return;
    }

    const target = findTarget(world, projectile);
    if (!target) {
      return;
    }

    const hitRadius = 1.2;
    const distance = distanceVec3(projectile.position, target.position);
    if (distance <= hitRadius) {
      const shooter = world.robots.entities.find((robot) => robot.id === projectile.shooterId);

      if (projectile.weapon === 'rocket') {
        applyRocketExplosion(world, projectile, shooter, telemetry, target);
      } else {
        applyDirectHit(world, projectile, target, shooter, telemetry);
      }
    }
  });
}
