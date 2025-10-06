import { createProjectile } from '../entities/Projectile';
import type { Robot } from '../entities/Robot';
import { calculateDamage, getWeaponData } from '../systems/weaponSystem';
import { lerpVector } from '../../utils/math';
import {
  addVectors,
  clampToArena,
  cloneVector,
  distance,
  normalize,
  scaleVector,
  subtractVectors,
} from '../utils/vector';
import type { Team, Vector3 } from '../../types';
import { setRobotBodyPosition, spawnProjectileBody } from './physics';
import type { WorldView } from './worldTypes';

export function getAliveRobots(world: WorldView, team?: Team): Robot[] {
  return world.entities.filter((robot) => robot.health > 0 && (!team || robot.team === team));
}

function findNearestEnemy(world: WorldView, robot: Robot): Robot | null {
  const enemies = getAliveRobots(world).filter((entity) => entity.team !== robot.team);
  if (enemies.length === 0) {
    return null;
  }
  return enemies.reduce((closest, candidate) => {
    if (!closest) {
      return candidate;
    }
    const current = distance(robot.position, candidate.position);
    const best = distance(robot.position, closest.position);
    return current < best ? candidate : closest;
  }, enemies[0]);
}

function findNearestCover(world: WorldView, position: Vector3): Vector3 | null {
  const cover = world.arena.obstacles.filter((obstacle) => obstacle.isCover);
  if (cover.length === 0) {
    return null;
  }
  return cloneVector(
    cover.reduce((closest, obstacle) => {
      if (!closest) {
        return obstacle;
      }
      const current = distance(position, obstacle.position);
      const best = distance(position, closest.position);
      return current < best ? obstacle : closest;
    }, cover[0]).position
  );
}

function updateRobotBehavior(world: WorldView, robot: Robot): void {
  const enemy = findNearestEnemy(world, robot);
  robot.aiState.targetId = enemy?.id ?? null;
  const opposing = robot.team === 'red' ? 'blue' : 'red';
  const teamRatio = world.teams[robot.team].activeRobots / Math.max(1, world.teams[opposing].activeRobots);
  const healthRatio = robot.health / robot.maxHealth;
  if (robot.health <= 20) {
    robot.aiState.behaviorMode = 'retreating';
  } else if (healthRatio < 0.5 || teamRatio < 1) {
    robot.aiState.behaviorMode = 'defensive';
  } else {
    robot.aiState.behaviorMode = 'aggressive';
  }
  robot.aiState.coverPosition =
    robot.aiState.behaviorMode !== 'aggressive'
      ? findNearestCover(world, robot.position)
      : null;
}

export function updateBehaviors(world: WorldView): void {
  getAliveRobots(world).forEach((robot) => updateRobotBehavior(world, robot));
}

export function propagateCaptainTargets(world: WorldView): void {
  (Object.keys(world.teams) as Team[]).forEach((team) => {
    const captain = getAliveRobots(world, team).find((robot) => robot.isCaptain);
    if (!captain || !captain.aiState.targetId) {
      return;
    }
    getAliveRobots(world, team)
      .filter((robot) => !robot.isCaptain)
      .forEach((robot) => {
        robot.aiState.targetId = captain.aiState.targetId;
      });
  });
}

function retreatPosition(world: WorldView, robot: Robot): Vector3 {
  const spawnCenter = world.teams[robot.team].spawnZone.center;
  const direction = normalize(subtractVectors(spawnCenter, robot.position));
  return clampToArena(world.arena, addVectors(robot.position, scaleVector(direction, 12)));
}

function maintainFormation(world: WorldView, robot: Robot, deltaTime: number): void {
  const captain = getAliveRobots(world, robot.team).find((entity) => entity.isCaptain);
  if (!captain || robot.isCaptain) {
    return;
  }
  const formationTarget = addVectors(captain.position, robot.aiState.formationOffset);
  const blended = lerpVector(formationTarget, robot.position, 0.2);
  const direction = normalize(subtractVectors(blended, robot.position));
  const movement = scaleVector(direction, 6 * deltaTime);
  const next = clampToArena(world.arena, addVectors(robot.position, movement));
  robot.position = next;
  setRobotBodyPosition(world.physics, robot, next);
}

export function applyMovement(world: WorldView, deltaTime: number): void {
  getAliveRobots(world).forEach((robot) => {
    const target = getAliveRobots(world).find((entity) => entity.id === robot.aiState.targetId);
    if (robot.aiState.behaviorMode === 'retreating') {
      const retreat = retreatPosition(world, robot);
      const direction = normalize(subtractVectors(retreat, robot.position));
      const movement = scaleVector(direction, 12 * deltaTime);
      const next = clampToArena(world.arena, addVectors(robot.position, movement));
      robot.position = next;
      setRobotBodyPosition(world.physics, robot, next);
      return;
    }
    if (robot.aiState.behaviorMode === 'defensive' && robot.aiState.coverPosition) {
      const direction = normalize(subtractVectors(robot.aiState.coverPosition, robot.position));
      const movement = scaleVector(direction, 8 * deltaTime);
      const next = clampToArena(world.arena, addVectors(robot.position, movement));
      robot.position = next;
      setRobotBodyPosition(world.physics, robot, next);
    } else if (target) {
      const direction = normalize(subtractVectors(target.position, robot.position));
      const movement = scaleVector(direction, 10 * deltaTime);
      const next = clampToArena(world.arena, addVectors(robot.position, movement));
      robot.position = next;
      setRobotBodyPosition(world.physics, robot, next);
    }
    maintainFormation(world, robot, deltaTime);
  });
}

export function fireWeapons(world: WorldView): void {
  const now = world.simulation.simulationTime;
  getAliveRobots(world).forEach((robot) => {
    const target = getAliveRobots(world).find((entity) => entity.id === robot.aiState.targetId);
    if (!target) {
      return;
    }
    const weapon = getWeaponData(robot.weaponType);
    if (now - robot.aiState.lastFireTime < weapon.fireRate) {
      return;
    }
    if (distance(robot.position, target.position) > weapon.effectiveRange) {
      return;
    }
    const projectile = createProjectile({
      id: `${robot.id}-projectile-${now.toFixed(3)}`,
      ownerId: robot.id,
      weaponType: robot.weaponType,
      position: cloneVector(robot.position),
      velocity: normalize(subtractVectors(target.position, robot.position)),
      damage: calculateDamage(robot.weaponType, target.weaponType),
      distanceTraveled: 0,
      maxDistance: weapon.effectiveRange * 2,
      spawnTime: now,
      maxLifetime: 5,
    });
    world.projectiles.push(projectile);
    spawnProjectileBody(world.physics, projectile);
    robot.stats.shotsFired += 1;
    robot.aiState.lastFireTime = now;
  });
}
