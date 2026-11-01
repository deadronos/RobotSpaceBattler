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
import {
  oppositeTeam,
  type TeamConfigs,
  type TeamId,
} from "../../lib/teamConfig";

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
  return fillTeamDirectives(robots, { red: "balanced", blue: "balanced" });
}

/** Allocation-free `buildTeamDirectives` into a reused result object. */
export function fillTeamDirectives(
  robots: RobotEntity[],
  out: TeamDirectiveMap,
): TeamDirectiveMap {
  let red = 0;
  let blue = 0;

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (!isActiveRobot(robot)) continue;
    if (robot.team === "red") red += 1;
    else blue += 1;
  }

  if (red > blue) {
    out.red = "offense";
    out.blue = "defense";
  } else if (blue > red) {
    out.red = "defense";
    out.blue = "offense";
  } else {
    out.red = "balanced";
    out.blue = "balanced";
  }

  return out;
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
  const centroid = vec3(0, 0, 0);
  return fillEnemyCentroid(team, robots, centroid) ? centroid : null;
}

/**
 * Sums the positions of the active robots of the enemy team into `out`.
 * @returns False when the enemy team has no active robots.
 */
export function fillEnemyCentroid(
  team: TeamId,
  robots: RobotEntity[],
  out: Vec3,
): boolean {
  out.x = 0;
  out.y = 0;
  out.z = 0;
  let count = 0;

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (robot.team === team || !isActiveRobot(robot)) continue;
    out.x += robot.position.x;
    out.y += robot.position.y;
    out.z += robot.position.z;
    count += 1;
  }

  if (count === 0) {
    return false;
  }

  const inverse = 1 / count;
  out.x *= inverse;
  out.y *= inverse;
  out.z *= inverse;
  return true;
}

export type AnchorTarget = RobotEntity | Vec3;

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
 * @param teams - The seeded team configs from the match (`battleWorld.teams`).
 * @returns The calculated anchor position.
 */
export function buildFormationAnchor(
  robot: RobotEntity,
  target: AnchorTarget | undefined,
  teams: TeamConfigs,
): Vec3 {
  return buildFormationAnchorInto(vec3(), robot, target, teams);
}

/** Allocation-free `buildFormationAnchor` writing into `out`. */
export function buildFormationAnchorInto(
  out: Vec3,
  robot: RobotEntity,
  target: AnchorTarget | undefined,
  teams: TeamConfigs,
): Vec3 {
  const targetPosition = resolveTargetPosition(
    target ?? teams[oppositeTeam(robot.team)].spawnCenter,
  );
  const dx = targetPosition.x - robot.position.x;
  const dy = targetPosition.y - robot.position.y;
  const dz = targetPosition.z - robot.position.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
  let directionX = 0;
  let directionZ = 0;
  if (length !== 0) {
    // The rotated direction keeps y at 0, so only x and z are needed; the
    // length above still includes dy to match the original vector maths.
    const inverse = 1 / length;
    directionX = dx * inverse;
    directionZ = dz * inverse;
  }

  const baseRadius =
    FORMATION_BASE_RADIUS + (robot.spawnIndex % 3) * FORMATION_RADIUS_VARIANCE;
  const strafe = robot.ai.strafeSign ?? 1;
  const angleOffset = ((robot.spawnIndex % 5) - 2) * 0.12 * strafe;
  const sin = Math.sin(angleOffset);
  const cos = Math.cos(angleOffset);
  const rotatedX = sin * directionZ + cos * directionX;
  const rotatedZ = cos * directionZ - sin * directionX;

  out.x = targetPosition.x + rotatedX * baseRadius;
  out.y = targetPosition.y;
  out.z = targetPosition.z + rotatedZ * baseRadius;
  return out;
}

/**
 * Finds a defensive cover point for a robot.
 *
 * @param robot - The robot entity.
 * @param enemyCentroid - The average position of enemies.
 * @param teams - The seeded team configs from the match (`battleWorld.teams`).
 * @returns A position providing cover (relative to spawn center).
 */
export function findCoverPoint(
  robot: RobotEntity,
  enemyCentroid: Vec3 | null,
  teams: TeamConfigs,
): Vec3 {
  const spawnCenter = teams[robot.team].spawnCenter;

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
