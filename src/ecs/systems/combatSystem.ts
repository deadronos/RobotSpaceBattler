import {
  addVec3,
  distanceVec3,
  normalizeVec3,
  scaleVec3,
  subtractVec3,
  vec3,
} from '../../lib/math/vec3';
import { TelemetryPort } from '../../runtime/simulation/ports';
import { getWeaponProfile } from '../../simulation/combat/weapons';
import { BattleWorld, ProjectileEntity, RobotEntity } from '../world';

function createProjectileId(world: BattleWorld): string {
  const id = `projectile-${world.state.nextProjectileId}`;
  world.state.nextProjectileId += 1;
  return id;
}

function createProjectile(
  shooter: RobotEntity,
  target: RobotEntity,
  world: BattleWorld,
): ProjectileEntity | null {
  if (target.health <= 0) {
    return null;
  }

  const profile = getWeaponProfile(shooter.weapon);
  const direction = normalizeVec3(subtractVec3(target.position, shooter.position));

  if (direction.x === 0 && direction.y === 0 && direction.z === 0) {
    return null;
  }

  const velocity = scaleVec3(direction, profile.projectileSpeed);
  const maxLifetime = Math.max(1, profile.range / profile.projectileSpeed) * 1000;

  return {
    id: createProjectileId(world),
    kind: 'projectile',
    team: shooter.team,
    shooterId: shooter.id,
    weapon: shooter.weapon,
    position: addVec3(shooter.position, vec3(0, 0.8, 0)),
    velocity,
    damage: profile.damage,
    maxLifetime,
    spawnTime: world.state.elapsedMs,
    distanceTraveled: 0,
    maxDistance: profile.range,
    speed: profile.projectileSpeed,
    targetId: target.id,
    projectileSize: profile.projectileSize,
    projectileColor: profile.projectileColor,
    trailColor: profile.trailColor,
    aoeRadius: profile.aoeRadius,
    explosionDurationMs: profile.explosionDurationMs,
    beamWidth: profile.beamWidth,
    impactDurationMs: profile.impactDurationMs,
  };
}

export function updateCombatSystem(world: BattleWorld, telemetry: TelemetryPort): void {
  const robots = world.robots.entities;
  if (robots.length === 0) {
    return;
  }

  const robotsById = new Map(robots.map((robot) => [robot.id, robot]));

  robots.forEach((robot) => {
    if (robot.health <= 0) {
      return;
    }

    if (robot.fireCooldown > 0 || robot.ai.mode === 'retreat') {
      return;
    }

    const target = robot.ai.targetId ? robotsById.get(robot.ai.targetId) : undefined;
    if (!target || target.health <= 0) {
      return;
    }

    const profile = getWeaponProfile(robot.weapon);
    const distance = distanceVec3(robot.position, target.position);
    if (distance > profile.range) {
      return;
    }

    const projectile = createProjectile(robot, target, world);
    if (!projectile) {
      return;
    }

    world.world.add(projectile);
    robot.fireCooldown = 1 / profile.fireRate;

    telemetry.recordFire({
      timestampMs: world.state.elapsedMs,
      entityId: robot.id,
      teamId: robot.team,
      weapon: robot.weapon,
    });
  });
}
