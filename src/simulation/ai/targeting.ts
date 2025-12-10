import { RobotEntity } from '../../ecs/world';
import { distanceSquaredVec3 } from '../../lib/math/vec3';
import { isActiveRobot } from '../../lib/robotHelpers';
import { TEAM_CONFIGS } from '../../lib/teamConfig';
import { sortEntities } from './targetingUtils';

function isEnemy(seeker: RobotEntity, target: RobotEntity): boolean {
  return target.team !== seeker.team && isActiveRobot(target) && target.id !== seeker.id;
}

/**
 * Finds the best enemy target for a robot.
 * Prioritizes closest enemies.
 *
 * @param seeker - The robot looking for a target.
 * @param robots - The list of all robots.
 * @param candidates - Optional subset of robots to consider (e.g., visible ones).
 * @returns The best target robot or undefined.
 */
export function findClosestEnemy(
  seeker: RobotEntity,
  robots: RobotEntity[],
  candidates?: RobotEntity[],
): RobotEntity | undefined {
  const pool = candidates ?? robots;
  const enemies = pool.filter((robot) => isEnemy(seeker, robot));

  if (enemies.length === 0) {
    return undefined;
  }

  // Use sortEntities to preserve tie-breaking logic (Health, Kills, SpawnDist, ID)
  // Logic from original code: DistanceSq > Kills (desc) > SpawnDist (asc) > ID
  // Wait, original sortByPriority:
  // if (a.distanceSq !== b.distanceSq) return a.distanceSq - b.distanceSq;
  // if (b.entity.kills !== a.entity.kills) return b.entity.kills - a.entity.kills;
  // if (a.spawnDistanceSq !== b.spawnDistanceSq) return a.spawnDistanceSq - b.spawnDistanceSq;
  // return a.entity.id.localeCompare(b.entity.id);

  const spawnCenter = TEAM_CONFIGS[enemies[0].team].spawnCenter;

  const sorted = sortEntities(
    enemies,
    (entity) => ({
      entity,
      distanceSq: distanceSquaredVec3(seeker.position, entity.position),
      spawnDistanceSq: distanceSquaredVec3(entity.position, spawnCenter),
    }),
    (a, b) => {
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
    },
  );

  return sorted[0];
}

/**
 * Selects a target for a captain robot.
 * Captains prioritize enemy captains and high-value targets.
 *
 * @param captain - The captain robot.
 * @param robots - The list of all robots.
 * @param candidates - Optional subset of robots to consider.
 * @returns The selected target robot or undefined.
 */
export function pickCaptainTarget(
  captain: RobotEntity,
  robots: RobotEntity[],
  candidates?: RobotEntity[],
): RobotEntity | undefined {
  const pool = candidates ?? robots;
  const enemies = pool.filter((robot) => isEnemy(captain, robot));

  // 1. Prefer closest enemy captain
  const enemyCaptains = enemies.filter((robot) => robot.isCaptain);
  if (enemyCaptains.length > 0) {
    // Also use sortEntities here to be safe?
    // Original code used rankCandidates which uses sortByPriority.
    // So yes, captains also used the tie-breaker logic!
    // rankCandidates(captain, captains).sort(sortByPriority)
    const spawnCenter = TEAM_CONFIGS[enemies[0].team].spawnCenter;
    const sortedCaptains = sortEntities(
      enemyCaptains,
      (entity) => ({
        entity,
        distanceSq: distanceSquaredVec3(captain.position, entity.position),
        spawnDistanceSq: distanceSquaredVec3(entity.position, spawnCenter),
      }),
      (a, b) => {
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
      },
    );
    return sortedCaptains[0];
  }

  // 2. Rank enemies by strategic value (Health > Kills > SpawnDist > ID)
  if (enemies.length === 0) {
    return undefined;
  }

  // Determine enemy spawn center for scoring
  const spawnCenter = TEAM_CONFIGS[enemies[0].team].spawnCenter;

  const sorted = sortEntities(
    enemies,
    (entity) => ({
      entity,
      spawnDistanceSq: distanceSquaredVec3(entity.position, spawnCenter),
    }),
    (a, b) => {
      if (b.entity.health !== a.entity.health) {
        return b.entity.health - a.entity.health;
      }
      if (b.entity.kills !== a.entity.kills) {
        return b.entity.kills - a.entity.kills;
      }
      if (a.spawnDistanceSq !== b.spawnDistanceSq) {
        return b.spawnDistanceSq - a.spawnDistanceSq; // Descending (furthest first)
      }
      return a.entity.id.localeCompare(b.entity.id);
    },
  );

  return sorted[0];
}
