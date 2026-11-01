import { RobotEntity } from "../../ecs/world";
import { vec3 } from "../../lib/math/vec3";
import { isActiveRobot } from "../../lib/robotHelpers";
import { TEAM_CONFIGS, TeamId } from "../../lib/teamConfig";
import {
  AnchorAssignment,
  AnchorTarget,
  TeamAnchorAssignments,
  TeamDirectiveMap,
  buildFormationAnchorInto,
  fillEnemyCentroid,
  fillTeamDirectives,
} from "./teamStrategy";

interface AnchorAssignmentScratch extends AnchorAssignment {
  /** Tick stamp, used to drop assignments for robots that are gone. */
  epoch: number;
}

// Per-tick scratch state, reused so anchor computation does not allocate.
const assignmentsScratch: Record<string, AnchorAssignmentScratch> = {};
const redRobotsScratch: RobotEntity[] = [];
const blueRobotsScratch: RobotEntity[] = [];
const directivesScratch: TeamDirectiveMap = {
  red: "balanced",
  blue: "balanced",
};
const centroidScratch = vec3();
let assignmentEpoch = 0;

/**
 * Sorts a team roster in place by spawn index, then id (stable insertion sort).
 * Allocates nothing and matches `slice().sort(...)` ordering exactly.
 */
function sortRoster(roster: RobotEntity[]): void {
  for (let i = 1; i < roster.length; i += 1) {
    const robot = roster[i];
    let j = i - 1;
    while (j >= 0) {
      const other = roster[j];
      const order =
        other.spawnIndex !== robot.spawnIndex
          ? other.spawnIndex - robot.spawnIndex
          : other.id.localeCompare(robot.id);
      // Stop at the first element that is not strictly greater: keeps the
      // sort stable for equal keys, like the original slice().sort().
      if (order <= 0) break;
      roster[j + 1] = other;
      j -= 1;
    }
    roster[j + 1] = robot;
  }
}

function trimRoster(roster: RobotEntity[], count: number): void {
  if (roster.length !== count) roster.length = count;
}

/**
 * Resolves the formation target for a team: the captain's target when set,
 * otherwise the enemy centroid.
 */
function resolveTeamAnchorTarget(
  team: TeamId,
  robots: RobotEntity[],
  captain: RobotEntity | undefined,
): AnchorTarget | undefined {
  const targetId = captain?.ai.targetId;
  if (targetId) {
    for (let i = 0; i < robots.length; i += 1) {
      if (robots[i].id === targetId) return robots[i];
    }
    return undefined;
  }

  if (fillEnemyCentroid(team, robots, centroidScratch)) {
    return centroidScratch;
  }

  return undefined;
}

/**
 * Computes the anchor assignments (positions and directives) for all robots in the team.
 * Coordinates the team's formation and strategy.
 *
 * The returned map and its anchor vectors are reused between calls (the AI
 * system reads them immediately), so callers must not retain them.
 *
 * @param robots - The list of all robots.
 * @returns A map of assignments for each robot.
 */
export function computeTeamAnchors(
  robots: RobotEntity[],
): TeamAnchorAssignments {
  const assignments = assignmentsScratch;
  const directives = fillTeamDirectives(robots, directivesScratch);
  let redCount = 0;
  let blueCount = 0;

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (!isActiveRobot(robot)) continue;
    if (robot.team === "red") {
      redRobotsScratch[redCount] = robot;
      redCount += 1;
    } else {
      blueRobotsScratch[blueCount] = robot;
      blueCount += 1;
    }
  }

  trimRoster(redRobotsScratch, redCount);
  trimRoster(blueRobotsScratch, blueCount);
  sortRoster(redRobotsScratch);
  sortRoster(blueRobotsScratch);

  assignmentEpoch += 1;
  const epoch = assignmentEpoch;
  fillTeamAssignments(
    "red",
    redRobotsScratch,
    robots,
    directives,
    assignments,
    epoch,
  );
  fillTeamAssignments(
    "blue",
    blueRobotsScratch,
    robots,
    directives,
    assignments,
    epoch,
  );

  // Drop assignments for robots that are gone, so a stale entry can never be
  // read for a dead robot.
  for (const id in assignments) {
    if (assignments[id].epoch !== epoch) {
      delete assignments[id];
    }
  }

  return assignments;
}

function fillTeamAssignments(
  team: TeamId,
  teamRobots: RobotEntity[],
  robots: RobotEntity[],
  directives: TeamDirectiveMap,
  assignments: Record<string, AnchorAssignmentScratch>,
  epoch: number,
): void {
  let captain: RobotEntity | undefined;
  for (let i = 0; i < teamRobots.length; i += 1) {
    if (teamRobots[i].isCaptain) {
      captain = teamRobots[i];
      break;
    }
  }

  const anchorTarget = resolveTeamAnchorTarget(team, robots, captain);
  const spawnCenter = TEAM_CONFIGS[team].spawnCenter;
  const directive = directives[team];

  for (let index = 0; index < teamRobots.length; index += 1) {
    const robot = teamRobots[index];
    const strafeSign = (index % 2 === 0 ? 1 : -1) as 1 | -1;
    const assignment =
      assignments[robot.id] ??
      (assignments[robot.id] = {
        anchorPosition: vec3(),
        strafeSign,
        directive,
        epoch,
      });

    assignment.strafeSign = strafeSign;
    assignment.directive = directive;
    assignment.epoch = epoch;

    const anchorPosition = assignment.anchorPosition ?? vec3();
    assignment.anchorPosition = anchorPosition;

    if (anchorTarget) {
      buildFormationAnchorInto(anchorPosition, robot, anchorTarget);
    } else {
      anchorPosition.x = spawnCenter.x + strafeSign * (4 + index);
      anchorPosition.y = spawnCenter.y;
      anchorPosition.z = spawnCenter.z + 4 + index;
    }
  }
}
