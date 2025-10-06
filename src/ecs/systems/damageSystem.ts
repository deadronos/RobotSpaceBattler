import type { PhysicsStepResult } from '../simulation/physics';
import { removeProjectileBody, removeRobotBody } from '../simulation/physics';
import type { WorldView } from '../simulation/worldTypes';
import { shouldDespawn } from '../entities/Projectile';
import { recordDamageDealt, recordDamageTaken, recordKill } from '../entities/Team';
import { reassignCaptain } from './ai/captainAI';
import { setTeamEntity } from './ai/common';

export function applyDamage(world: WorldView, targetId: string, amount: number, attackerId?: string): void {
  const target = world.entities.find((robot) => robot.id === targetId);
  if (!target) {
    return;
  }
  target.health = Math.max(0, target.health - amount);
  target.stats.damageTaken += amount;
  setTeamEntity(world, target.team, recordDamageTaken(world.teams[target.team], amount));

  if (attackerId) {
    const attacker = world.entities.find((robot) => robot.id === attackerId);
    if (attacker) {
      attacker.stats.damageDealt += amount;
      setTeamEntity(world, attacker.team, recordDamageDealt(world.teams[attacker.team], amount));
      if (target.health === 0) {
        attacker.stats.kills += 1;
        setTeamEntity(world, attacker.team, recordKill(world.teams[attacker.team]));
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
  world.ecs?.robots.remove(robot);
  removeRobotBody(world.physics, robotId);
  if (robot.isCaptain) {
    reassignCaptain(world, robot.team);
  }
}

export function handleProjectileHits(world: WorldView, hits: PhysicsStepResult['hits']): void {
  hits.forEach((hit) => {
    applyDamage(world, hit.targetId, hit.damage, hit.ownerId);
    removeProjectileBody(world.physics, hit.projectileId);
    const index = world.projectiles.findIndex((projectile) => projectile.id === hit.projectileId);
    if (index !== -1) {
      const [projectile] = world.projectiles.splice(index, 1);
      world.ecs?.projectiles.remove(projectile);
    }
  });
}

export function cleanupProjectiles(world: WorldView, extraRemovals: string[] = []): void {
  const removalSet = new Set(extraRemovals);
  const currentTime = world.simulation.simulationTime;
  for (let index = world.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = world.projectiles[index];
    const remove = removalSet.has(projectile.id) || shouldDespawn(projectile, currentTime);
    if (remove) {
      world.projectiles.splice(index, 1);
      world.ecs?.projectiles.remove(projectile);
      removeProjectileBody(world.physics, projectile.id);
    }
  }
}
