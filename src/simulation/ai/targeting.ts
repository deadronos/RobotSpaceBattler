import { RobotEntity } from "../../ecs/world";
import { distanceSquaredVec3 } from "../../lib/math/vec3";
import { isActiveRobot } from "../../lib/robotHelpers";
import { TEAM_CONFIGS } from "../../lib/teamConfig";

interface RankedTarget {
  entity: RobotEntity;
  distanceSq: number;
  spawnDistanceSq: number;
}

function rankCandidates(
  seeker: RobotEntity,
  candidates: RobotEntity[],
): RankedTarget[] {
  const spawnCenter = TEAM_CONFIGS[candidates[0]?.team ?? "blue"].spawnCenter;

  return candidates.map((entity) => ({
    entity,
    distanceSq: distanceSquaredVec3(seeker.position, entity.position),
    spawnDistanceSq: distanceSquaredVec3(entity.position, spawnCenter),
  }));
}

function sortByPriority(a: RankedTarget, b: RankedTarget): number {
  if (a.distanceSq !== b.distanceSq) {
    return a.distanceSq - b.distanceSq;
  }

  if (b.entity.kills !== a.entity.kills) {
    return b.entity.kills - a.entity.kills;
  }

  if (a.spawnDistanceSq !== b.spawnDistanceSq) {
    return a.spawnDistanceSq - b.spawnDistanceSq;
  }

  return a.entity.id.localeCompare(b.entity.id);
}

function filterEnemies(
  seeker: RobotEntity,
  robots: RobotEntity[],
): RobotEntity[] {
  return robots.filter(
    (robot) =>
      robot.team !== seeker.team &&
      isActiveRobot(robot) &&
      robot.id !== seeker.id,
  );
}

export function findClosestEnemy(
  seeker: RobotEntity,
  robots: RobotEntity[],
  candidates?: RobotEntity[],
): RobotEntity | undefined {
  const pool = candidates ?? robots;
  const enemies = filterEnemies(seeker, pool);
  const ranked = rankCandidates(seeker, enemies);
  ranked.sort(sortByPriority);
  return ranked[0]?.entity;
}

function sortCaptainTargets(a: RankedTarget, b: RankedTarget): number {
  if (b.entity.health !== a.entity.health) {
    return b.entity.health - a.entity.health;
  }

  if (b.entity.kills !== a.entity.kills) {
    return b.entity.kills - a.entity.kills;
  }

  if (a.spawnDistanceSq !== b.spawnDistanceSq) {
    return b.spawnDistanceSq - a.spawnDistanceSq;
  }

  return a.entity.id.localeCompare(b.entity.id);
}

function rankCaptainCandidates(
  seeker: RobotEntity,
  enemies: RobotEntity[],
): RankedTarget[] {
  const spawnCenter = TEAM_CONFIGS[enemies[0]?.team ?? "blue"].spawnCenter;

  return enemies.map((entity) => ({
    entity,
    distanceSq: distanceSquaredVec3(seeker.position, entity.position),
    spawnDistanceSq: distanceSquaredVec3(entity.position, spawnCenter),
  }));
}

export function pickCaptainTarget(
  captain: RobotEntity,
  robots: RobotEntity[],
  candidates?: RobotEntity[],
): RobotEntity | undefined {
  const pool = candidates ?? robots;
  const enemies = filterEnemies(captain, pool);
  const captains = enemies.filter((robot) => robot.isCaptain);

  if (captains.length > 0) {
    const ranked = rankCandidates(captain, captains);
    ranked.sort(sortByPriority);
    return ranked[0]?.entity;
  }

  const ranked = rankCaptainCandidates(captain, enemies);
  ranked.sort(sortCaptainTargets);
  return ranked[0]?.entity;
}
