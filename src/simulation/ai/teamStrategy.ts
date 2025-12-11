import { RobotEntity } from "../../ecs/world";
import {
  FORMATION_BASE_RADIUS,
  FORMATION_RADIUS_VARIANCE,
} from "../../lib/constants";
import {
  addVec3,
  normalizeVec3,
  scaleVec3,
  subtractVec3,
  Vec3,
  vec3,
} from "../../lib/math/vec3";
import { isActiveRobot } from "../../lib/robotHelpers";
import { TEAM_CONFIGS, TeamId } from "../../lib/teamConfig";

/**
 * Types of strategic directives a team can adopt.
 */
export type TeamDirective = "offense" | "defense" | "balanced";

/**
 * Mapping of team IDs to their current directive.
 */
export interface TeamDirectiveMap {
  red: TeamDirective;
  blue: TeamDirective;
}

/**
 * Assigned anchor position and behavior for a robot.
 */
export interface AnchorAssignment {
  /** The target position to hold or move towards. */
  anchorPosition: Vec3 | null;
  /** The preferred strafing direction. */
  strafeSign: 1 | -1;
  /** The strategic directive. */
  directive: TeamDirective;
}

/**
 * Map of robot IDs to their anchor assignments.
 */
export type TeamAnchorAssignments = Record<string, AnchorAssignment>;

/**
 * Determines the strategic directive for each team based on the current battle state.
 * @param robots - The list of all robots.
 * @returns A map of directives for each team.
 */
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
    return { red: "offense", blue: "defense" };
  }

  if (counts.blue > counts.red) {
    return { red: "defense", blue: "offense" };
  }

  return { red: "balanced", blue: "balanced" };
}

/**
 * Calculates the centroid (average position) of enemy robots.
 * @param team - The observing team.
 * @param robots - The list of all robots.
 * @returns The centroid position or null if no enemies are active.
 */
export function computeEnemyCentroid(
  team: TeamId,
  robots: RobotEntity[],
): Vec3 | null {
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

  if ("position" in target) {
    return target.position;
  }

  return target;
}

/**
 * Calculates a formation anchor position for a robot relative to a target.
 * Creates a spread-out formation to avoid bunching up.
 *
 * @param robot - The robot entity.
 * @param target - The target entity or position.
 * @returns The calculated anchor position.
 */
export function buildFormationAnchor(
  robot: RobotEntity,
  target: AnchorTarget | undefined,
): Vec3 {
  const targetPosition = resolveTargetPosition(
    target ?? TEAM_CONFIGS[robot.team === "red" ? "blue" : "red"].spawnCenter,
  );
  const direction = normalizeVec3(subtractVec3(targetPosition, robot.position));
  const baseRadius =
    FORMATION_BASE_RADIUS + (robot.spawnIndex % 3) * FORMATION_RADIUS_VARIANCE;
  const strafe = robot.ai.strafeSign ?? 1;
  const angleOffset = ((robot.spawnIndex % 5) - 2) * 0.12 * strafe;
  const rotatedDirection = vec3(
    Math.sin(angleOffset) * direction.z + Math.cos(angleOffset) * direction.x,
    0,
    Math.cos(angleOffset) * direction.z - Math.sin(angleOffset) * direction.x,
  );

  return addVec3(targetPosition, scaleVec3(rotatedDirection, baseRadius));
}

/**
 * Finds a defensive cover point for a robot.
 *
 * @param robot - The robot entity.
 * @param enemyCentroid - The average position of enemies.
 * @returns A position providing cover (relative to spawn center).
 */
export function findCoverPoint(
  robot: RobotEntity,
  enemyCentroid: Vec3 | null,
): Vec3 {
  const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;

  if (!enemyCentroid) {
    const strafe = robot.ai.strafeSign ?? 1;
    return addVec3(spawnCenter, vec3(-2 * strafe, 0, 0));
  }

  const direction = normalizeVec3(subtractVec3(spawnCenter, enemyCentroid));
  const coverDistance = 6 + (robot.spawnIndex % 3);
  return addVec3(spawnCenter, scaleVec3(direction, coverDistance));
}

/**
 * Determines the primary target or focus point for a team.
 * @param team - The team ID.
 * @param robots - The list of all robots.
 * @param targetId - Optional specific target ID.
 * @returns The target entity or position.
 */
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

/**
 * Computes the anchor assignments (positions and directives) for all robots in the team.
 * Coordinates the team's formation and strategy.
 *
 * @param robots - The list of all robots.
 * @returns A map of assignments for each robot.
 */
export function computeTeamAnchors(
  robots: RobotEntity[],
): TeamAnchorAssignments {
  const assignments: TeamAnchorAssignments = {};
  const directives = buildTeamDirectives(robots);

  const grouped: Record<TeamId, RobotEntity[]> = {
    red: [],
    blue: [],
  };

  robots.filter(isActiveRobot).forEach((robot) => {
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
        anchorPosition = addVec3(
          TEAM_CONFIGS[team].spawnCenter,
          fallbackOffset,
        );
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
