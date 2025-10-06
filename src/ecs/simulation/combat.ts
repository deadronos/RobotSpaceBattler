import type { PhysicsStepResult } from './physics';
import { removeProjectileBody, removeRobotBody } from './physics';
import type { WorldView } from './worldTypes';
import { shouldDespawn } from '../entities/Projectile';
import { recordDamageDealt, recordDamageTaken, recordKill, updateTeamCaptain } from '../entities/Team';
import type { Team } from '../../types';
import { getAliveRobots } from './aiController';

export function applyDamage(world: WorldView, targetId: string, amount: number, attackerId?: string): void {
  const target = world.entities.find((robot) => robot.id === targetId);
  if (!target) {
    return;
  }
  target.health = Math.max(0, target.health - amount);
  target.stats.damageTaken += amount;
  world.teams[target.team] = recordDamageTaken(world.teams[target.team], amount);

  if (attackerId) {
    const attacker = world.entities.find((robot) => robot.id === attackerId);
    if (attacker) {
      attacker.stats.damageDealt += amount;
      world.teams[attacker.team] = recordDamageDealt(world.teams[attacker.team], amount);
      if (target.health === 0) {
        attacker.stats.kills += 1;
        world.teams[attacker.team] = recordKill(world.teams[attacker.team]);
      }
    }
  }

  if (target.health === 0) {
    eliminateRobot(world, targetId);
  }
}

export function eliminateRobot(world: WorldView, robotId: string): void {
  const index = world.entities.findIndex((entity) => entity.id === robotId);
  if (index === -1) {
    return;
  }
  const [robot] = world.entities.splice(index, 1);
  removeRobotBody(world.physics, robotId);
  if (robot.isCaptain) {
    assignCaptain(world, robot.team);
  }
}

export function assignCaptain(world: WorldView, team: Team): void {
  const alive = getAliveRobots(world, team);
  const newCaptain = alive.sort((a, b) => b.health - a.health)[0];
  alive.forEach((robot) => {
    robot.isCaptain = newCaptain ? robot.id === newCaptain.id : false;
  });
  world.teams[team] = updateTeamCaptain(world.teams[team], newCaptain?.id ?? null);
}

export function handleProjectileHits(world: WorldView, hits: PhysicsStepResult['hits']): void {
  hits.forEach((hit) => {
    applyDamage(world, hit.targetId, hit.damage, hit.ownerId);
    removeProjectileBody(world.physics, hit.projectileId);
    world.projectiles = world.projectiles.filter((projectile) => projectile.id !== hit.projectileId);
  });
}

export function cleanupProjectiles(world: WorldView, extraRemovals: string[] = []): void {
  const removalSet = new Set(extraRemovals);
  const currentTime = world.simulation.simulationTime;
  world.projectiles = world.projectiles.filter((projectile) => {
    const remove = removalSet.has(projectile.id) || shouldDespawn(projectile, currentTime);
    if (remove) {
      removeProjectileBody(world.physics, projectile.id);
    }
    return !remove;
  });
}
