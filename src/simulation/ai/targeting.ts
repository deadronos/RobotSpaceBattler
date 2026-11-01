import { RobotEntity } from "../../ecs/world";
import { distanceSquaredVec3 } from "../../lib/math/vec3";
import { isAlly, isEnemy } from "../../lib/robotHelpers";
import { TEAM_CONFIGS } from "../../lib/teamConfig";

// The selectors below run once per robot per tick, so they are written as
// plain loops over the candidate list without allocating score objects.
// The comparison order matches the original findBestEntity scan exactly:
// the first candidate wins unless a later one is strictly better.

/**
 * Tie-break shared by enemy and captain selection: distance, then kills
 * (more is better), then distance to the spawn centre, then id. Returns true
 * when candidate A is strictly better than B.
 */
function isCloserEnemy(
  aDistSq: number,
  a: RobotEntity,
  aSpawnSq: number,
  bDistSq: number,
  b: RobotEntity,
  bSpawnSq: number,
): boolean {
  if (aDistSq !== bDistSq) {
    return aDistSq - bDistSq < 0;
  }
  if (b.kills !== a.kills) {
    return b.kills - a.kills < 0;
  }
  if (aSpawnSq !== bSpawnSq) {
    return aSpawnSq - bSpawnSq < 0;
  }
  return a.id.localeCompare(b.id) < 0;
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
  let best: RobotEntity | undefined;
  let bestDistSq = 0;
  let bestSpawnSq = 0;
  let spawnCenter = TEAM_CONFIGS.red.spawnCenter;

  for (let i = 0; i < pool.length; i += 1) {
    const entity = pool[i];
    if (!isEnemy(seeker, entity)) continue;
    if (!best) {
      // Spawn centre comes from the first enemy, as in the original scan.
      spawnCenter = TEAM_CONFIGS[entity.team].spawnCenter;
    }
    const distSq = distanceSquaredVec3(seeker.position, entity.position);
    const spawnSq = distanceSquaredVec3(entity.position, spawnCenter);
    if (
      !best ||
      isCloserEnemy(distSq, entity, spawnSq, bestDistSq, best, bestSpawnSq)
    ) {
      best = entity;
      bestDistSq = distSq;
      bestSpawnSq = spawnSq;
    }
  }

  return best;
}

/**
 * Finds the best ally target for a medic robot.
 * Prioritizes injured allies.
 *
 * @param seeker - The medic robot.
 * @param robots - The list of all robots.
 * @param candidates - Optional subset of robots to consider.
 * @returns The best ally to heal or undefined.
 */
export function findClosestAlly(
  seeker: RobotEntity,
  robots: RobotEntity[],
  candidates?: RobotEntity[],
): RobotEntity | undefined {
  const pool = candidates ?? robots;
  let best: RobotEntity | undefined;
  let bestRatio = 0;
  let bestDistSq = 0;

  for (let i = 0; i < pool.length; i += 1) {
    const entity = pool[i];
    // Only target injured allies
    if (!isAlly(seeker, entity) || entity.health >= entity.maxHealth) continue;
    const ratio = entity.health / entity.maxHealth;
    const distSq = distanceSquaredVec3(seeker.position, entity.position);
    // Prioritize lowest health percentage first, then distance.
    if (
      !best ||
      (Math.abs(ratio - bestRatio) > 0.1
        ? ratio - bestRatio < 0
        : distSq - bestDistSq < 0)
    ) {
      best = entity;
      bestRatio = ratio;
      bestDistSq = distSq;
    }
  }

  return best;
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

  // 1. Prefer closest enemy captain; the first enemy fixes the spawn centre.
  let firstEnemy: RobotEntity | undefined;
  let bestCaptain: RobotEntity | undefined;
  let capDistSq = 0;
  let capSpawnSq = 0;
  let spawnCenter = TEAM_CONFIGS.red.spawnCenter;

  for (let i = 0; i < pool.length; i += 1) {
    const entity = pool[i];
    if (!isEnemy(captain, entity)) continue;
    if (!firstEnemy) {
      firstEnemy = entity;
      spawnCenter = TEAM_CONFIGS[entity.team].spawnCenter;
    }
    if (!entity.isCaptain) continue;
    const distSq = distanceSquaredVec3(captain.position, entity.position);
    const spawnSq = distanceSquaredVec3(entity.position, spawnCenter);
    if (
      !bestCaptain ||
      isCloserEnemy(distSq, entity, spawnSq, capDistSq, bestCaptain, capSpawnSq)
    ) {
      bestCaptain = entity;
      capDistSq = distSq;
      capSpawnSq = spawnSq;
    }
  }

  if (bestCaptain) {
    return bestCaptain;
  }

  // 2. Rank enemies by strategic value (Health > Kills > SpawnDist > ID)
  if (!firstEnemy) {
    return undefined;
  }

  let best: RobotEntity | undefined;
  let bestSpawnSq = 0;
  for (let i = 0; i < pool.length; i += 1) {
    const entity = pool[i];
    if (!isEnemy(captain, entity)) continue;
    const spawnSq = distanceSquaredVec3(entity.position, spawnCenter);
    if (!best) {
      best = entity;
      bestSpawnSq = spawnSq;
      continue;
    }
    let better: boolean;
    if (best.health !== entity.health) {
      better = best.health - entity.health < 0;
    } else if (best.kills !== entity.kills) {
      better = best.kills - entity.kills < 0;
    } else if (spawnSq !== bestSpawnSq) {
      better = bestSpawnSq - spawnSq < 0; // Descending (furthest first)
    } else {
      better = entity.id.localeCompare(best.id) < 0;
    }
    if (better) {
      best = entity;
      bestSpawnSq = spawnSq;
    }
  }

  return best;
}
