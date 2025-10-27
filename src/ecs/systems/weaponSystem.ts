import type { MatchTraceEventInput } from "../../runtime/matchTrace";
import { getDamageMultiplier, getWeaponStats } from "../../lib/weapons";
import { addVec3, normalize, scaleVec3, subVec3 } from "../utils/vector";
import { BattleWorld, ProjectileEntity, RobotEntity } from "../world";

let projectileCounter = 0;

export interface WeaponSystemOptions {
  timestampMs: number;
  emitEvent?: (event: MatchTraceEventInput) => void;
}

function createProjectile(
  robot: RobotEntity,
  target: RobotEntity,
): ProjectileEntity {
  const weaponStats = getWeaponStats(robot.weapon);
  const direction = normalize(subVec3(target.position, robot.position));

  return {
    id: `${robot.id}-projectile-${projectileCounter++}`,
    kind: "projectile",
    team: robot.team,
    position: addVec3(robot.position, scaleVec3(direction, 0.8)),
    velocity: scaleVec3(direction, weaponStats.projectileSpeed),
    damage: weaponStats.damage,
    ttl: 3,
    weapon: robot.weapon,
    sourceId: robot.id,
  };
}

export function updateWeaponSystem(
  world: BattleWorld,
  deltaSeconds: number,
  options?: WeaponSystemOptions,
): void {
  const robots = world.robots.entities;
  const timestampMs = options?.timestampMs ?? 0;

  robots.forEach((robot: RobotEntity) => {
    if (robot.health <= 0) {
      return;
    }

    robot.fireCooldown = Math.max(0, robot.fireCooldown - deltaSeconds);

    if (!robot.ai.targetId || robot.fireCooldown > 0) {
      return;
    }

    const target = robots.find(
      (candidate: RobotEntity) =>
        candidate.id === robot.ai.targetId && candidate.health > 0,
    );
    if (!target) {
      return;
    }

    const weaponStats = getWeaponStats(robot.weapon);
    const direction = subVec3(target.position, robot.position);
    const distanceSq =
      direction.x * direction.x +
      direction.y * direction.y +
      direction.z * direction.z;
    if (distanceSq > weaponStats.range * weaponStats.range) {
      return;
    }

    const projectile = createProjectile(robot, target);
    world.world.add(projectile);
    robot.fireCooldown = weaponStats.fireRate;
    options?.emitEvent?.({
      type: "fire",
      timestampMs,
      entityId: robot.id,
      projectileId: projectile.id,
      targetId: target.id,
      teamId: robot.team,
    });
  });
}

export interface ProjectileSystemOptions {
  timestampMs: number;
  emitEvent?: (event: MatchTraceEventInput) => void;
}

export function updateProjectileSystem(
  world: BattleWorld,
  deltaSeconds: number,
  options?: ProjectileSystemOptions,
): void {
  const { world: miniplexWorld } = world;
  const projectiles = [...world.projectiles.entities];
  const robots = world.robots.entities;
  const timestampMs = options?.timestampMs ?? 0;

  projectiles.forEach((projectile: ProjectileEntity) => {
    projectile.ttl -= deltaSeconds;
    projectile.position = addVec3(
      projectile.position,
      scaleVec3(projectile.velocity, deltaSeconds),
    );

    if (projectile.ttl <= 0) {
      miniplexWorld.remove(projectile);
      return;
    }

    for (const candidate of robots) {
      if (candidate.team === projectile.team || candidate.health <= 0) {
        continue;
      }

      const delta = subVec3(candidate.position, projectile.position);
      const distanceSq =
        delta.x * delta.x + delta.y * delta.y + delta.z * delta.z;

      if (distanceSq < 1.2) {
        const multiplier = getDamageMultiplier(
          projectile.weapon,
          candidate.weapon,
        );
        const damage = projectile.damage * multiplier;
        candidate.health = Math.max(0, candidate.health - damage);
        candidate.lastDamageTimestamp = Date.now();
        options?.emitEvent?.({
          type: "damage",
          timestampMs,
          entityId: projectile.id,
          attackerId: projectile.sourceId,
          targetId: candidate.id,
          amount: damage,
          teamId: projectile.team,
        });

        if (candidate.health <= 0) {
          const source = robots.find(
            (robot: RobotEntity) => robot.id === projectile.sourceId,
          );
          if (source) {
            source.kills += 1;
          }
          options?.emitEvent?.({
            type: "death",
            timestampMs,
            entityId: candidate.id,
            attackerId: projectile.sourceId,
            teamId: candidate.team,
          });
        }

        miniplexWorld.remove(projectile);
        break;
      }
    }
  });
}
