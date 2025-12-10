import { SpawnOptions,spawnTeams } from '../../ecs/systems/spawnSystem';
import { BattleWorld, ObstacleEntity, resetBattleWorld } from '../../ecs/world';
import { Vec3, vec3 } from '../../lib/math/vec3';

type Vec3Input = Vec3 | [number, number, number] | { x: number; y: number; z: number } | undefined;

export interface ObstacleFixtureEntry {
  id?: string;
  obstacleType?: ObstacleEntity['obstacleType'];
  position?: Vec3Input;
  orientation?: number;
  shape?: ObstacleEntity['shape'];
  blocksVision?: boolean;
  blocksMovement?: boolean;
  active?: boolean;
  movementPattern?:
    | (ObstacleEntity['movementPattern'] & {
        /** Legacy alias for patternType in fixtures. */
        kind?: 'linear' | 'rotation' | 'oscillate';
        /** Optional targetPosition shortcut for two-point linear paths. */
        targetPosition?: Vec3Input;
      })
    | undefined
    | null;
  hazardSchedule?: ObstacleEntity['hazardSchedule'] | null;
  hazardEffects?: ObstacleEntity['hazardEffects'] | null;
  durability?: number;
  maxDurability?: number;
}

export interface ObstacleFixture {
  obstacles: ObstacleFixtureEntry[];
}

export interface MatchSpawnOptions extends SpawnOptions {
  /** Optional fixture data used to seed obstacles into the match. */
  obstacleFixture?: ObstacleFixture;
  /** When true (default), clears existing entities before spawning. */
  resetWorld?: boolean;
}

function toVec3(value: Vec3Input): Vec3 {
  if (!value) return vec3(0, 0, 0);
  if (Array.isArray(value)) {
    const [x = 0, y = 0, z = 0] = value;
    return vec3(x, y, z);
  }
  if (typeof value === 'object' && 'x' in value && 'y' in value && 'z' in value) {
    return vec3(value.x ?? 0, value.y ?? 0, value.z ?? 0);
  }
  return vec3(0, 0, 0);
}

function normalizeMovementPattern(pattern: ObstacleFixtureEntry['movementPattern']): ObstacleEntity['movementPattern'] {
  if (!pattern) return null;
  const patternType =
    pattern.patternType ??
    (pattern as { kind?: 'linear' | 'rotation' | 'oscillate' }).kind;
  if (patternType !== 'linear' && patternType !== 'rotation' && patternType !== 'oscillate') return null;

  const normalized: ObstacleEntity['movementPattern'] = {
    patternType,
    speed: pattern.speed,
    loop: pattern.loop,
    pingPong: pattern.pingPong,
    phase: pattern.phase ?? (pattern as { phaseOffset?: number }).phaseOffset,
  };

  if (patternType === 'rotation') {
    normalized.pivot = pattern.pivot ? toVec3(pattern.pivot) : undefined;
    return normalized;
  }

  const legacyPath = (pattern as { path?: Vec3Input[]; segments?: Vec3Input[] })?.path ??
    (pattern as { path?: Vec3Input[]; segments?: Vec3Input[] })?.segments;
  const hasTarget =
    (pattern as { targetPosition?: Vec3Input; to?: Vec3Input; end?: Vec3Input }).targetPosition ??
    (pattern as { targetPosition?: Vec3Input; to?: Vec3Input; end?: Vec3Input }).to ??
    (pattern as { targetPosition?: Vec3Input; to?: Vec3Input; end?: Vec3Input }).end;
  const points =
    pattern.points ??
    legacyPath ??
    (hasTarget
      ? [
          toVec3(
            (pattern as { start?: Vec3Input; from?: Vec3Input; origin?: Vec3Input }).start ??
              (pattern as { start?: Vec3Input; from?: Vec3Input; origin?: Vec3Input }).from ??
              (pattern as { start?: Vec3Input; from?: Vec3Input; origin?: Vec3Input }).origin ??
              vec3(),
          ),
          toVec3(
            (pattern as { targetPosition?: Vec3Input; to?: Vec3Input; end?: Vec3Input }).targetPosition ??
              (pattern as { targetPosition?: Vec3Input; to?: Vec3Input; end?: Vec3Input }).to ??
              (pattern as { targetPosition?: Vec3Input; to?: Vec3Input; end?: Vec3Input }).end ??
              vec3(),
          ),
        ]
      : undefined);

  if (points && Array.isArray(points)) {
    normalized.points = points.map((p) => toVec3(p as Vec3Input));
  }

  return normalized;
}

function normalizeObstacle(entry: ObstacleFixtureEntry, index: number): ObstacleEntity {
  const obstacleType = (entry.obstacleType as ObstacleEntity['obstacleType']) ?? 'barrier';
  const isHazard = obstacleType === 'hazard';
  return {
    id: entry.id ?? `obstacle-${index}`,
    kind: 'obstacle',
    obstacleType,
    position: toVec3(entry.position),
    orientation: entry.orientation ?? 0,
    shape:
      entry.shape ??
      (obstacleType === 'hazard'
        ? { kind: 'circle', radius: 1 }
        : {
            kind: 'box',
            halfWidth: 1,
            halfDepth: 1,
          }),
    blocksVision: entry.blocksVision ?? !isHazard,
    blocksMovement: entry.blocksMovement ?? !isHazard,
    active: entry.active ?? !isHazard,
    movementPattern: normalizeMovementPattern(entry.movementPattern),
    hazardSchedule: (entry as { schedule?: ObstacleEntity['hazardSchedule'] }).schedule ?? entry.hazardSchedule ?? null,
    hazardEffects: (entry as { effects?: ObstacleEntity['hazardEffects'] }).effects ?? entry.hazardEffects ?? null,
    durability: entry.durability,
    maxDurability: entry.maxDurability,
  };
}

export function spawnObstaclesFromFixture(world: BattleWorld, fixture: ObstacleFixture): void {
  fixture.obstacles.forEach((entry, index) => {
    const obstacle = normalizeObstacle(entry, index);
    world.world.add(obstacle);
  });
}

/**
 * Spawns a full match (obstacles + teams) using fixture data.
 * @param world - battle world container
 * @param options - spawn configuration and optional fixture
 */
export function spawnMatch(world: BattleWorld, options: MatchSpawnOptions = {}): void {
  const shouldReset = options.resetWorld ?? true;
  if (shouldReset) {
    resetBattleWorld(world);
  }

  if (options.obstacleFixture) {
    spawnObstaclesFromFixture(world, options.obstacleFixture);
  }

  spawnTeams(world, options);
}
