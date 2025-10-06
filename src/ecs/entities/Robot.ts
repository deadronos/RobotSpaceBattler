import type {
  AIState,
  Quaternion,
  RobotStats,
  Team,
  Vector3,
  WeaponType,
} from "../../types";

export interface Robot {
  id: string;
  team: Team;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  health: number;
  maxHealth: number;
  weaponType: WeaponType;
  isCaptain: boolean;
  aiState: AIState;
  stats: RobotStats;
}

export interface RobotInput extends Robot {}

const VALID_TEAMS: readonly Team[] = ["red", "blue"];

function assertValidTeam(team: Team): void {
  if (!VALID_TEAMS.includes(team)) {
    throw new Error(`Invalid team: ${team}`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeVector(vector: Vector3): Vector3 {
  return {
    x: Number.isFinite(vector.x) ? vector.x : 0,
    y: Number.isFinite(vector.y) ? Math.max(0, vector.y) : 0,
    z: Number.isFinite(vector.z) ? vector.z : 0,
  };
}

function sanitizeQuaternion(quaternion: Quaternion): Quaternion {
  const length = Math.hypot(
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w,
  );
  if (length === 0) {
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  return {
    x: quaternion.x / length,
    y: quaternion.y / length,
    z: quaternion.z / length,
    w: quaternion.w / length,
  };
}

export function normalizeRobot(input: RobotInput): Robot {
  assertValidTeam(input.team);

  const maxHealth = Math.max(1, input.maxHealth);
  const clampedHealth = clamp(input.health, 0, maxHealth);

  return {
    ...input,
    team: input.team,
    maxHealth,
    health: clampedHealth,
    position: sanitizeVector(input.position),
    rotation: sanitizeQuaternion(input.rotation),
    velocity: sanitizeVector(input.velocity),
    stats: {
      kills: Math.max(0, input.stats.kills),
      damageDealt: Math.max(0, input.stats.damageDealt),
      damageTaken: Math.max(0, input.stats.damageTaken),
      timeAlive: Math.max(0, input.stats.timeAlive),
      shotsFired: Math.max(0, input.stats.shotsFired),
    },
    aiState: {
      ...input.aiState,
      lastFireTime: Math.max(0, input.aiState.lastFireTime),
      formationOffset: sanitizeVector(input.aiState.formationOffset),
      coverPosition: input.aiState.coverPosition
        ? sanitizeVector(input.aiState.coverPosition)
        : null,
    },
  };
}

export function createRobot(input: RobotInput): Robot {
  return normalizeRobot(input);
}

export function hasValidCaptainDistribution(robots: Robot[]): boolean {
  const activeCounts: Record<Team, number> = { red: 0, blue: 0 };
  const captainCounts: Record<Team, number> = { red: 0, blue: 0 };

  robots.forEach((robot) => {
    const normalized = normalizeRobot(robot);
    if (normalized.health <= 0) {
      return;
    }

    activeCounts[normalized.team] += 1;
    if (normalized.isCaptain) {
      captainCounts[normalized.team] += 1;
    }
  });

  return VALID_TEAMS.every((team) => {
    if (activeCounts[team] === 0) {
      return captainCounts[team] === 0;
    }

    return captainCounts[team] === 1;
  });
}
