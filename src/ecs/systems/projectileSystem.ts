import { applyCaptaincy } from '../../lib/captainElection';
import { addInPlaceVec3, distanceVec3, scaleVec3 } from '../../lib/math/vec3';
import { isActiveRobot } from '../../lib/robotHelpers';
import { TelemetryPort } from '../../runtime/simulation/ports';
import { calculateDamage } from '../../simulation/damage/damagePipeline';
import { BattleWorld, ProjectileEntity, RobotEntity } from '../world';

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

function applyHit(
  world: BattleWorld,
  projectile: ProjectileEntity,
  target: RobotEntity,
  telemetry: TelemetryPort,
): void {
  const shooter = world.robots.entities.find((robot) => robot.id === projectile.shooterId);
  
  // Use new damage pipeline with archetype multiplier integration (T023)
  // WeaponType ('laser'|'gun'|'rocket') matches WeaponArchetype type
  const damageResult = calculateDamage({
    baseDamage: projectile.damage,
    attackerArchetype: projectile.weapon as 'laser' | 'gun' | 'rocket',
    defenderArchetype: target.weapon as 'laser' | 'gun' | 'rocket',
  });
  
  const damage = damageResult.finalDamage;
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
      applyHit(world, projectile, target, telemetry);
    }
  });
}
