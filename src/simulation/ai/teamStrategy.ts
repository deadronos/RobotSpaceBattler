import { RobotEntity } from '../../ecs/world';
import { FORMATION_BASE_RADIUS, FORMATION_RADIUS_VARIANCE } from '../../lib/constants';
import {
  addVec3,
  normalizeVec3,
  scaleVec3,
  subtractVec3,
  Vec3,
  vec3,
} from '../../lib/math/vec3';
import { TEAM_CONFIGS,TeamId } from '../../lib/teamConfig';

export type TeamDirective = 'offense' | 'defense' | 'balanced';

export interface TeamDirectiveMap {
  red: TeamDirective;
  blue: TeamDirective;
}

export interface AnchorAssignment {
  anchorPosition: Vec3 | null;
  strafeSign: 1 | -1;
  directive: TeamDirective;
}

export type TeamAnchorAssignments = Record<string, AnchorAssignment>;

function isActiveRobot(robot: RobotEntity): boolean {
  return robot.health > 0;
}

export function buildTeamDirectives(robots: RobotEntity[]): TeamDirectiveMap {
  const counts = robots.reduce(
    (acc, robot) => {
      if (isActiveRobot(robot)) {
        acc[robot.team] += 1;
      }
      return acc;
    },
    { red: 0, blue: 0 },
  );

  if (counts.red > counts.blue) {
    return { red: 'offense', blue: 'defense' };
  }

  if (counts.blue > counts.red) {
    return { red: 'defense', blue: 'offense' };
  }

  return { red: 'balanced', blue: 'balanced' };
}

export function computeEnemyCentroid(team: TeamId, robots: RobotEntity[]): Vec3 | null {
  const enemies = robots.filter(
    (robot) => robot.team !== team && isActiveRobot(robot),
  );

  if (enemies.length === 0) {
    return null;
  }

  const sum = enemies.reduce(
    (acc, robot) => addVec3(acc, robot.position),
    vec3(0, 0, 0),
  );

  return scaleVec3(sum, 1 / enemies.length);
}

type AnchorTarget = RobotEntity | Vec3;

function resolveTargetPosition(target: AnchorTarget | undefined): Vec3 {
  if (!target) {
    return vec3(0, 0, 0);
  }

  if ('position' in target) {
    return target.position;
  }

  return target;
}

export function buildFormationAnchor(
  robot: RobotEntity,
  target: AnchorTarget | undefined,
): Vec3 {
  const targetPosition = resolveTargetPosition(
    target ?? TEAM_CONFIGS[robot.team === 'red' ? 'blue' : 'red'].spawnCenter,
  );
  const direction = normalizeVec3(
    subtractVec3(targetPosition, robot.position),
  );
  const baseRadius = FORMATION_BASE_RADIUS + (robot.spawnIndex % 3) * FORMATION_RADIUS_VARIANCE;
  const strafe = robot.ai.strafeSign ?? 1;
  const angleOffset = ((robot.spawnIndex % 5) - 2) * 0.12 * strafe;
  const rotatedDirection = vec3(
    Math.sin(angleOffset) * direction.z + Math.cos(angleOffset) * direction.x,
    0,
    Math.cos(angleOffset) * direction.z - Math.sin(angleOffset) * direction.x,
  );

  return addVec3(
    targetPosition,
    scaleVec3(rotatedDirection, baseRadius),
  );
}

export function findCoverPoint(robot: RobotEntity, enemyCentroid: Vec3 | null): Vec3 {
  const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;

  if (!enemyCentroid) {
    const strafe = robot.ai.strafeSign ?? 1;
    return addVec3(spawnCenter, vec3(-2 * strafe, 0, 0));
  }

  const direction = normalizeVec3(subtractVec3(spawnCenter, enemyCentroid));
  const coverDistance = 6 + (robot.spawnIndex % 3);
  return addVec3(spawnCenter, scaleVec3(direction, coverDistance));
}

export function computeEnemyTarget(
  team: TeamId,
  robots: RobotEntity[],
  targetId?: string,
): AnchorTarget | undefined {
  if (targetId) {
    return robots.find((robot) => robot.id === targetId);
  }

  const centroid = computeEnemyCentroid(team, robots);
  return centroid ?? undefined;
}

export function computeTeamAnchors(robots: RobotEntity[]): TeamAnchorAssignments {
  const assignments: TeamAnchorAssignments = {};
  const directives = buildTeamDirectives(robots);

  const grouped: Record<TeamId, RobotEntity[]> = {
    red: [],
    blue: [],
  };

  robots
    .filter(isActiveRobot)
    .forEach((robot) => {
      grouped[robot.team].push(robot);
    });

  (Object.keys(grouped) as TeamId[]).forEach((team) => {
    const teamRobots = grouped[team].slice().sort((a, b) => {
      if (a.spawnIndex !== b.spawnIndex) {
        return a.spawnIndex - b.spawnIndex;
      }

      return a.id.localeCompare(b.id);
    });

    const captain = teamRobots.find((robot) => robot.isCaptain);
    const anchorTarget = computeEnemyTarget(team, robots, captain?.ai.targetId);

    teamRobots.forEach((robot, index) => {
      const strafeSign = (index % 2 === 0 ? 1 : -1) as 1 | -1;

      let anchorPosition: Vec3 | null;
      if (anchorTarget) {
        anchorPosition = buildFormationAnchor(robot, anchorTarget);
      } else {
        const fallbackOffset = vec3(strafeSign * (4 + index), 0, 4 + index);
        anchorPosition = addVec3(TEAM_CONFIGS[team].spawnCenter, fallbackOffset);
      }

      assignments[robot.id] = {
        anchorPosition,
        strafeSign,
        directive: directives[team],
      };
    });
  });

  return assignments;
}
