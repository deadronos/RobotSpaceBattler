import { lerpVector } from '../../../utils/math';
import type { Vector3 } from '../../../types';
import { getDamageMultiplier } from '../weaponSystem';
import type { Robot } from '../../entities/Robot';
import { setRobotBodyPosition } from '../../simulation/physics';
import type { WorldView } from '../../simulation/worldTypes';
import { addVectors, clampToArena, distance, normalize, scaleVector, subtractVectors } from '../../utils/vector';
import { getAliveRobots, getOpposingTeam } from './common';

const AGGRESSIVE_SPEED = 10;
const DEFENSIVE_SPEED = 8;
const RETREAT_SPEED = 12;
const RETREAT_HEALTH_THRESHOLD = 20;
const DEFENSIVE_HEALTH_THRESHOLD = 0.45;
const TEAM_DISADVANTAGE_THRESHOLD = 0.85;

function scoreTarget(robot: Robot, candidate: Robot, robotPosition: Vector3): number {
  const multiplier = getDamageMultiplier(robot.weaponType, candidate.weaponType);
  const targetDistance = distance(robotPosition, candidate.position);
  return multiplier * 100 - targetDistance;
}

function selectTarget(world: WorldView, robot: Robot): Robot | null {
  const enemies = getAliveRobots(world).filter((entity) => entity.team !== robot.team);
  if (enemies.length === 0) {
    return null;
  }

  return enemies.reduce<Robot | null>((best, candidate) => {
    if (!best) {
      return candidate;
    }
    const candidateScore = scoreTarget(robot, candidate, robot.position);
    const bestScore = scoreTarget(robot, best, robot.position);
    if (candidateScore === bestScore) {
      const candidateDistance = distance(robot.position, candidate.position);
      const bestDistance = distance(robot.position, best.position);
      return candidateDistance < bestDistance ? candidate : best;
    }
    return candidateScore > bestScore ? candidate : best;
  }, null);
}

function findNearestCover(world: WorldView, position: Vector3): Vector3 | null {
  const cover = world.arena.obstacles.filter((obstacle) => obstacle.isCover);
  if (cover.length === 0) {
    return null;
  }
  return cover
    .map((obstacle) => obstacle.position)
    .reduce<Vector3 | null>((closest, candidate) => {
      if (!closest) {
        return candidate;
      }
      const candidateDistance = distance(position, candidate);
      const closestDistance = distance(position, closest);
      return candidateDistance < closestDistance ? candidate : closest;
    }, null);
}

function chooseBehavior(world: WorldView, robot: Robot): void {
  const target = selectTarget(world, robot);
  robot.aiState.targetId = target?.id ?? null;

  const opposing = getOpposingTeam(robot.team);
  const teamRatio = world.teams[opposing]
    ? world.teams[robot.team].activeRobots / Math.max(1, world.teams[opposing].activeRobots)
    : 1;
  const healthRatio = robot.maxHealth > 0 ? robot.health / robot.maxHealth : 0;

  if (robot.health <= RETREAT_HEALTH_THRESHOLD) {
    robot.aiState.behaviorMode = 'retreating';
  } else if (healthRatio < DEFENSIVE_HEALTH_THRESHOLD || teamRatio < TEAM_DISADVANTAGE_THRESHOLD) {
    robot.aiState.behaviorMode = 'defensive';
  } else {
    robot.aiState.behaviorMode = 'aggressive';
  }

  robot.aiState.coverPosition =
    robot.aiState.behaviorMode !== 'aggressive' ? findNearestCover(world, robot.position) : null;
}

function moveToward(world: WorldView, robot: Robot, target: Vector3, speed: number, deltaTime: number): void {
  const direction = normalize(subtractVectors(target, robot.position));
  const step = scaleVector(direction, speed * deltaTime);
  const nextPosition = clampToArena(world.arena, addVectors(robot.position, step));
  robot.position = nextPosition;
  setRobotBodyPosition(world.physics, robot, nextPosition);
}

function getRetreatPoint(world: WorldView, robot: Robot): Vector3 {
  const spawnCenter = world.teams[robot.team].spawnZone.center;
  const direction = normalize(subtractVectors(spawnCenter, robot.position));
  const offset = scaleVector(direction, 12);
  return clampToArena(world.arena, addVectors(robot.position, offset));
}

function peekFromCover(robot: Robot, cover: Vector3): Vector3 {
  const blend = lerpVector(cover, robot.position, 0.25);
  return { x: blend.x, y: robot.position.y, z: blend.z };
}

export function evaluateIndividualBehaviors(world: WorldView): void {
  getAliveRobots(world).forEach((robot) => {
    chooseBehavior(world, robot);
  });
}

export function applyIndividualMovement(world: WorldView, deltaTime: number): void {
  getAliveRobots(world).forEach((robot) => {
    if (robot.aiState.behaviorMode === 'retreating') {
      moveToward(world, robot, getRetreatPoint(world, robot), RETREAT_SPEED, deltaTime);
      return;
    }

    if (robot.aiState.behaviorMode === 'defensive' && robot.aiState.coverPosition) {
      const coverPosition = peekFromCover(robot, robot.aiState.coverPosition);
      moveToward(world, robot, coverPosition, DEFENSIVE_SPEED, deltaTime);
      return;
    }

    if (robot.aiState.targetId) {
      const target = world.entities.find((entity) => entity.id === robot.aiState.targetId);
      if (target) {
        moveToward(world, robot, target.position, AGGRESSIVE_SPEED, deltaTime);
      }
    }
  });
}
