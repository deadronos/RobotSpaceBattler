import type { PhysicsStepResult } from '../simulation/physics';
import { removeProjectileBody, removeRobotBody } from '../simulation/physics';
import type { WorldView } from '../simulation/worldTypes';
import { shouldDespawn } from '../entities/Projectile';
import { recordDamageDealt, recordDamageTaken, recordKill, updateTeamCaptain, type TeamEntity } from '../entities/Team';
import type { Team } from '../../types';
import { getAliveRobots } from '../simulation/aiController';

function setTeam(world: WorldView, team: Team, nextTeam: TeamEntity): void {
  const previous = world.teams[team];
  world.teams[team] = nextTeam;
  if (world.ecs?.teams) {
    world.ecs.teams.remove(previous);
    world.ecs.teams.add(nextTeam);
  }
}

export function applyDamage(world: WorldView, targetId: string, amount: number, attackerId?: string): void {
  const target = world.entities.find((robot) => robot.id === targetId);
  if (!target) {
    return;
  }
  target.health = Math.max(0, target.health - amount);
  target.stats.damageTaken += amount;
  setTeam(world, target.team, recordDamageTaken(world.teams[target.team], amount));

  if (attackerId) {
    const attacker = world.entities.find((robot) => robot.id === attackerId);
    if (attacker) {
      attacker.stats.damageDealt += amount;
      setTeam(world, attacker.team, recordDamageDealt(world.teams[attacker.team], amount));
      if (target.health === 0) {
        attacker.stats.kills += 1;
        setTeam(world, attacker.team, recordKill(world.teams[attacker.team]));
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
    assignCaptain(world, robot.team);
  }
}

export function assignCaptain(world: WorldView, team: Team): void {
  const alive = getAliveRobots(world, team);
  const newCaptain = alive.sort((a, b) => b.health - a.health)[0];
  alive.forEach((robot) => {
    robot.isCaptain = newCaptain ? robot.id === newCaptain.id : false;
  });
  setTeam(world, team, updateTeamCaptain(world.teams[team], newCaptain?.id ?? null));
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
