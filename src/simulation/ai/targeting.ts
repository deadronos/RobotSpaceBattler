import { distance } from "../../ecs/utils/vector";
import { RobotEntity } from "../../ecs/world";
import { TEAM_CONFIGS } from "../../lib/teamConfig";

const DISTANCE_EPSILON = 1e-6;

interface TargetCandidate {
  robot: RobotEntity;
  distanceToAttacker: number;
  spawnDistance: number;
}

function compareByCloseness(a: TargetCandidate, b: TargetCandidate): number {
  if (
    Math.abs(a.distanceToAttacker - b.distanceToAttacker) > DISTANCE_EPSILON
  ) {
    return a.distanceToAttacker - b.distanceToAttacker;
  }

  if (a.robot.health !== b.robot.health) {
    return b.robot.health - a.robot.health;
  }

  if (a.robot.kills !== b.robot.kills) {
    return b.robot.kills - a.robot.kills;
  }

  if (Math.abs(a.spawnDistance - b.spawnDistance) > DISTANCE_EPSILON) {
    return a.spawnDistance - b.spawnDistance;
  }

  return a.robot.id.localeCompare(b.robot.id);
}

function buildCandidate(
  attacker: RobotEntity,
  candidate: RobotEntity,
): TargetCandidate {
  const spawnCenter = TEAM_CONFIGS[candidate.team].spawnCenter;
  return {
    robot: candidate,
    distanceToAttacker: distance(attacker.position, candidate.position),
    spawnDistance: distance(candidate.position, spawnCenter),
  };
}

export function findClosestEnemy(
  robot: RobotEntity,
  robots: RobotEntity[],
): RobotEntity | undefined {
  const enemies = robots.filter(
    (candidate) => candidate.team !== robot.team && candidate.health > 0,
  );

  if (enemies.length === 0) {
    return undefined;
  }

  const candidates = enemies.map((candidate) =>
    buildCandidate(robot, candidate),
  );
  candidates.sort(compareByCloseness);
  return candidates[0]?.robot;
}

function compareCaptainPriority(
  a: TargetCandidate,
  b: TargetCandidate,
): number {
  if (a.robot.health !== b.robot.health) {
    return b.robot.health - a.robot.health;
  }

  if (a.robot.kills !== b.robot.kills) {
    return b.robot.kills - a.robot.kills;
  }

  if (Math.abs(a.spawnDistance - b.spawnDistance) > DISTANCE_EPSILON) {
    return a.spawnDistance - b.spawnDistance;
  }

  return a.robot.id.localeCompare(b.robot.id);
}

export function pickCaptainTarget(
  robot: RobotEntity,
  robots: RobotEntity[],
): RobotEntity | undefined {
  const enemies = robots.filter(
    (candidate) => candidate.team !== robot.team && candidate.health > 0,
  );

  if (enemies.length === 0) {
    return undefined;
  }

  const captainCandidates = enemies
    .filter((candidate) => candidate.isCaptain)
    .map((candidate) => buildCandidate(robot, candidate));

  if (captainCandidates.length > 0) {
    captainCandidates.sort(compareCaptainPriority);
    return captainCandidates[0]?.robot;
  }

  const candidates = enemies.map((candidate) =>
    buildCandidate(robot, candidate),
  );
  candidates.sort(compareCaptainPriority);
  return candidates[0]?.robot;
}
