import { getTeamConfig, RobotEntity, TeamId } from "../ecs/world";
import { distanceSquaredVec3 } from "./math/vec3";
import { isActiveRobot } from "./robotHelpers";

/**
 * Calculates a score for a robot to determine captaincy eligibility.
 *
 * @param robot - The robot entity to evaluate.
 * @param spawnCenterDistance - The squared distance from the robot to its team's spawn center.
 * @returns An object containing metrics used for comparison.
 */
function captainScore(robot: RobotEntity, spawnCenterDistance: number) {
  return {
    health: robot.health,
    kills: robot.kills,
    spawnCenterDistance,
    id: robot.id,
  };
}

/**
 * Elects a captain for the specified team based on various metrics.
 * The criteria for election are (in order of priority):
 * 1. Highest Health
 * 2. Highest Kills
 * 3. Closest to spawn center
 * 4. ID (lexicographical)
 *
 * @param team - The team ID for which to elect a captain.
 * @param robots - The list of all robot entities.
 * @returns The ID of the elected captain robot, or null if no eligible robots exist.
 */
export function electCaptain(
  team: TeamId,
  robots: RobotEntity[],
): string | null {
  const teamConfig = getTeamConfig(team);
  const eligible = robots.filter(
    (robot) => robot.team === team && isActiveRobot(robot),
  );

  if (eligible.length === 0) {
    return null;
  }

  const sorted = eligible
    .map((robot) => {
      const spawnDistance = distanceSquaredVec3(
        robot.position,
        teamConfig.spawnCenter,
      );
      return { robot, metrics: captainScore(robot, spawnDistance) };
    })
    .sort((a, b) => {
      if (b.metrics.health !== a.metrics.health) {
        return b.metrics.health - a.metrics.health;
      }

      if (b.metrics.kills !== a.metrics.kills) {
        return b.metrics.kills - a.metrics.kills;
      }

      if (a.metrics.spawnCenterDistance !== b.metrics.spawnCenterDistance) {
        return a.metrics.spawnCenterDistance - b.metrics.spawnCenterDistance;
      }

      return a.metrics.id.localeCompare(b.metrics.id);
    });

  return sorted[0]?.robot.id ?? null;
}

/**
 * Elects a captain and updates the robot entities with the captain status.
 *
 * @param team - The team ID.
 * @param robots - The list of all robot entities.
 */
export function applyCaptaincy(team: TeamId, robots: RobotEntity[]): void {
  const captainId = electCaptain(team, robots);

  robots.forEach((robot) => {
    if (robot.team !== team) {
      return;
    }

    robot.isCaptain = captainId === robot.id;
  });
}
