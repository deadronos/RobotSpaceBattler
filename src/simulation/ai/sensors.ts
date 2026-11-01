import { BattleWorld, EnemyMemoryEntry, RobotEntity } from "../../ecs/world";
import { cloneVec3, distanceSquaredVec3, Vec3 } from "../../lib/math/vec3";
import { isEnemy } from "../../lib/robotHelpers";
import {
  isLineOfSightBlocked,
  isLineOfSightBlockedRuntime,
} from "../environment/arenaGeometry";

/** Maximum distance at which a robot can see or sense an enemy. */
export const SENSOR_RANGE = 38;
const SENSOR_RANGE_SQ = SENSOR_RANGE * SENSOR_RANGE;
const PROXIMITY_RANGE = 8;
const PROXIMITY_RANGE_SQ = PROXIMITY_RANGE * PROXIMITY_RANGE;
const MEMORY_DURATION_MS = 8000;

function collectEnemies(
  robot: RobotEntity,
  robots: RobotEntity[],
): RobotEntity[] {
  return robots.filter((candidate) => isEnemy(robot, candidate));
}

function rememberEnemy(
  memory: Record<string, EnemyMemoryEntry>,
  enemy: RobotEntity,
  timestamp: number,
): void {
  const entry = memory[enemy.id];
  if (entry) {
    // Reuse the existing entry; this runs every tick for every visible enemy.
    entry.position.x = enemy.position.x;
    entry.position.y = enemy.position.y;
    entry.position.z = enemy.position.z;
    entry.timestamp = timestamp;
    return;
  }
  memory[enemy.id] = { position: cloneVec3(enemy.position), timestamp };
}

// Scratch state reused across calls (the simulation is single threaded).
const visibleScratch: RobotEntity[] = [];
const proximityScratch: RobotEntity[] = [];
const losOptionsScratch: {
  obstacles: BattleWorld["obstacles"]["entities"] | undefined;
} = { obstacles: undefined };

/**
 * Snapshot of sensor data for a robot.
 */
export interface SensorSnapshot {
  /**
   * List of enemies currently visible to the robot. The array is a shared
   * scratch buffer, only valid until the next `updateRobotSensors` call.
   */
  visibleEnemies: RobotEntity[];
  /** List of enemies detected by proximity sensors (even if not visible). */
  proximityDetections: RobotEntity[];
}

function pruneMemory(
  memory: Record<string, EnemyMemoryEntry>,
  cutoff: number,
): void {
  for (const key in memory) {
    if (memory[key].timestamp < cutoff) {
      delete memory[key];
    }
  }
}

/**
 * Updates the robot's sensors, including vision and proximity.
 * Also manages the memory of enemy positions.
 *
 * @param robot - The robot entity.
 * @param robots - List of all robots in the world.
 * @param timestampMs - Current simulation time in milliseconds.
 * @returns A snapshot of the sensor data.
 */
export function updateRobotSensors(
  robot: RobotEntity,
  robots: RobotEntity[],
  timestampMs: number,
  battleWorld?: BattleWorld,
  potentialEnemies?: RobotEntity[],
): SensorSnapshot {
  const enemies = potentialEnemies ?? collectEnemies(robot, robots);
  const visible = visibleScratch;
  const proximity = proximityScratch;
  let visibleCount = 0;
  let proximityCount = 0;
  losOptionsScratch.obstacles = battleWorld?.obstacles?.entities;

  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    const distanceSq = distanceSquaredVec3(robot.position, enemy.position);
    if (distanceSq > SENSOR_RANGE_SQ) {
      continue;
    }

    if (
      !isLineOfSightBlockedRuntime(
        robot.position,
        enemy.position,
        losOptionsScratch,
      )
    ) {
      visible[visibleCount] = enemy;
      visibleCount += 1;
      continue;
    }

    if (distanceSq <= PROXIMITY_RANGE_SQ) {
      proximity[proximityCount] = enemy;
      proximityCount += 1;
    }
  }

  // Trim once; `length = 0` + push would reallocate the backing stores.
  if (visible.length !== visibleCount) visible.length = visibleCount;
  if (proximity.length !== proximityCount) proximity.length = proximityCount;

  if (!robot.ai.enemyMemory) {
    robot.ai.enemyMemory = {};
  }
  const memory = robot.ai.enemyMemory;
  pruneMemory(memory, timestampMs - MEMORY_DURATION_MS);

  for (let i = 0; i < visible.length; i += 1) {
    rememberEnemy(memory, visible[i], timestampMs);
  }

  for (let i = 0; i < proximity.length; i += 1) {
    rememberEnemy(memory, proximity[i], timestampMs);
  }

  // Reuse the id array in place instead of allocating a new one per tick.
  const visibleIds =
    robot.ai.visibleEnemyIds ?? (robot.ai.visibleEnemyIds = []);
  visibleIds.length = visible.length;
  for (let i = 0; i < visible.length; i += 1) {
    visibleIds[i] = visible[i].id;
  }

  return {
    visibleEnemies: visible,
    proximityDetections: proximity,
  };
}

const latestMemoryScratch: [string, EnemyMemoryEntry] = [
  "",
  { position: { x: 0, y: 0, z: 0 }, timestamp: 0 },
];

/**
 * Retrieves the most recent memory of an enemy position.
 * @param robot - The robot entity.
 * @returns A tuple of [enemyId, memoryEntry] or null if no memory exists. The
 * tuple is a shared scratch value: read it before the next call.
 */
export function getLatestEnemyMemory(
  robot: RobotEntity,
): [string, EnemyMemoryEntry] | null {
  const memory = robot.ai.enemyMemory;
  if (!memory) return null;

  let latestId: string | null = null;
  let latestEntry: EnemyMemoryEntry | null = null;
  for (const id in memory) {
    const entry = memory[id];
    if (!latestEntry || entry.timestamp > latestEntry.timestamp) {
      latestId = id;
      latestEntry = entry;
    }
  }

  if (latestId === null || !latestEntry) {
    return null;
  }
  latestMemoryScratch[0] = latestId;
  latestMemoryScratch[1] = latestEntry;
  return latestMemoryScratch;
}

/**
 * Checks if there is a clear line of sight between two robots.
 * @param robot - The observer robot.
 * @param target - The target robot.
 * @returns True if line of sight is clear, false otherwise.
 */
export function hasLineOfSight(
  robot: RobotEntity,
  target: RobotEntity,
): boolean {
  return !isLineOfSightBlocked(robot.position, target.position);
}

/**
 * Predicts a search anchor position based on the last known enemy position.
 * @param targetMemory - The memory entry for the target.
 * @returns The predicted position or null.
 */
export function predictSearchAnchor(
  targetMemory: EnemyMemoryEntry | null,
): Vec3 | null {
  if (!targetMemory) {
    return null;
  }

  return cloneVec3(targetMemory.position);
}
