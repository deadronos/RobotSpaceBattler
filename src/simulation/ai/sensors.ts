import { EnemyMemoryEntry,RobotEntity } from '../../ecs/world';
import {
  cloneVec3,
  distanceSquaredVec3,
  Vec3,
} from '../../lib/math/vec3';
import { isActiveRobot } from '../../lib/robotHelpers';
import { isLineOfSightBlocked } from '../environment/arenaGeometry';

const SENSOR_RANGE = 38;
const SENSOR_RANGE_SQ = SENSOR_RANGE * SENSOR_RANGE;
const PROXIMITY_RANGE = 8;
const PROXIMITY_RANGE_SQ = PROXIMITY_RANGE * PROXIMITY_RANGE;
const MEMORY_DURATION_MS = 8000;

function collectEnemies(robot: RobotEntity, robots: RobotEntity[]): RobotEntity[] {
  return robots.filter(
    (candidate) => candidate.team !== robot.team && isActiveRobot(candidate) && candidate.id !== robot.id,
  );
}

function rememberEnemy(
  memory: Record<string, EnemyMemoryEntry>,
  enemy: RobotEntity,
  timestamp: number,
): void {
  memory[enemy.id] = {
    position: cloneVec3(enemy.position),
    timestamp,
  };
}

/**
 * Snapshot of sensor data for a robot.
 */
export interface SensorSnapshot {
  /** List of enemies currently visible to the robot. */
  visibleEnemies: RobotEntity[];
  /** List of enemies detected by proximity sensors (even if not visible). */
  proximityDetections: RobotEntity[];
}

function pruneMemory(memory: Record<string, EnemyMemoryEntry>, cutoff: number): void {
  Object.keys(memory).forEach((key) => {
    if (memory[key].timestamp < cutoff) {
      delete memory[key];
    }
  });
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
): SensorSnapshot {
  const enemies = collectEnemies(robot, robots);
  const visible: RobotEntity[] = [];
  const proximity: RobotEntity[] = [];

  for (const enemy of enemies) {
    const distanceSq = distanceSquaredVec3(robot.position, enemy.position);
    if (distanceSq > SENSOR_RANGE_SQ) {
      continue;
    }

    if (!isLineOfSightBlocked(robot.position, enemy.position)) {
      visible.push(enemy);
      continue;
    }

    if (distanceSq <= PROXIMITY_RANGE_SQ) {
      proximity.push(enemy);
    }
  }

  if (!robot.ai.enemyMemory) {
    robot.ai.enemyMemory = {};
  }
  const memory = robot.ai.enemyMemory;
  pruneMemory(memory, timestampMs - MEMORY_DURATION_MS);

  for (const enemy of visible) {
    rememberEnemy(memory, enemy, timestampMs);
  }

  for (const enemy of proximity) {
    rememberEnemy(memory, enemy, timestampMs);
  }

  robot.ai.visibleEnemyIds = visible.map((enemy) => enemy.id);

  return {
    visibleEnemies: visible,
    proximityDetections: proximity,
  };
}

/**
 * Retrieves the most recent memory of an enemy position.
 * @param robot - The robot entity.
 * @returns A tuple of [enemyId, memoryEntry] or null if no memory exists.
 */
export function getLatestEnemyMemory(
  robot: RobotEntity,
): [string, EnemyMemoryEntry] | null {
  const memory = robot.ai.enemyMemory;
  if (!memory) return null;

  let latest: [string, EnemyMemoryEntry] | null = null;
  for (const [id, entry] of Object.entries(memory)) {
    if (!latest || entry.timestamp > latest[1].timestamp) {
      latest = [id, entry];
    }
  }

  return latest;
}

/**
 * Checks if there is a clear line of sight between two robots.
 * @param robot - The observer robot.
 * @param target - The target robot.
 * @returns True if line of sight is clear, false otherwise.
 */
export function hasLineOfSight(robot: RobotEntity, target: RobotEntity): boolean {
  return !isLineOfSightBlocked(robot.position, target.position);
}

/**
 * Predicts a search anchor position based on the last known enemy position.
 * @param targetMemory - The memory entry for the target.
 * @returns The predicted position or null.
 */
export function predictSearchAnchor(targetMemory: EnemyMemoryEntry | null): Vec3 | null {
  if (!targetMemory) {
    return null;
  }

  return cloneVec3(targetMemory.position);
}
