import { RobotEntity } from "../../ecs/world";
import { isActiveRobot } from "../../lib/robotHelpers";

/**
 * Groups active robots by their team.
 *
 * @param robots - The list of all robot entities.
 * @returns A map where keys are team IDs and values are arrays of active robots for that team.
 */
export function groupRobotsByTeam(
  robots: RobotEntity[],
): Map<string, RobotEntity[]> {
  const robotsByTeam = new Map<string, RobotEntity[]>();

  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (!robotsByTeam.has(robot.team)) {
      robotsByTeam.set(robot.team, []);
    }

    if (isActiveRobot(robot)) {
      robotsByTeam.get(robot.team)?.push(robot);
    }
  }
  return robotsByTeam;
}

/**
 * Maps each team to a list of their enemies (all active robots not on their team).
 *
 * @param robotsByTeam - A map of active robots grouped by team.
 * @returns A map where keys are team IDs and values are arrays of enemy robots.
 */
export function mapEnemiesByTeam(
  robotsByTeam: Map<string, RobotEntity[]>,
): Map<string, RobotEntity[]> {
  const enemiesByTeam = new Map<string, RobotEntity[]>();
  const teams = Array.from(robotsByTeam.keys());
  for (const team of teams) {
    const enemies: RobotEntity[] = [];
    for (const otherTeam of teams) {
      if (team !== otherTeam) {
        enemies.push(...(robotsByTeam.get(otherTeam) ?? []));
      }
    }
    enemiesByTeam.set(team, enemies);
  }
  return enemiesByTeam;
}
