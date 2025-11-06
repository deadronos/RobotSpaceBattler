import { EnemyMemoryEntry,RobotEntity } from '../../ecs/world';
import {
  cloneVec3,
  distanceSquaredVec3,
  Vec3,
} from '../../lib/math/vec3';
import { isLineOfSightBlocked } from '../environment/arenaGeometry';

const SENSOR_RANGE = 38;
const SENSOR_RANGE_SQ = SENSOR_RANGE * SENSOR_RANGE;
const PROXIMITY_RANGE = 8;
const PROXIMITY_RANGE_SQ = PROXIMITY_RANGE * PROXIMITY_RANGE;
const MEMORY_DURATION_MS = 8000;

function collectEnemies(robot: RobotEntity, robots: RobotEntity[]): RobotEntity[] {
  return robots.filter(
    (candidate) => candidate.team !== robot.team && candidate.health > 0 && candidate.id !== robot.id,
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

export interface SensorSnapshot {
  visibleEnemies: RobotEntity[];
  proximityDetections: RobotEntity[];
}

function pruneMemory(memory: Record<string, EnemyMemoryEntry>, cutoff: number): void {
  Object.keys(memory).forEach((key) => {
    if (memory[key].timestamp < cutoff) {
      delete memory[key];
    }
  });
}

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

export function hasLineOfSight(robot: RobotEntity, target: RobotEntity): boolean {
  return !isLineOfSightBlocked(robot.position, target.position);
}

export function predictSearchAnchor(targetMemory: EnemyMemoryEntry | null): Vec3 | null {
  if (!targetMemory) {
    return null;
  }

  return cloneVec3(targetMemory.position);
}
