import { RobotEntity } from "../ecs/world";

/**
 * Type guard and utility functions for robot entities.
 */

/**
 * Checks if a robot is active (alive) in the battle.
 * A robot is considered active if its health is greater than zero.
 *
 * @param robot - The robot entity to check
 * @returns true if the robot is alive, false otherwise
 */
export function isActiveRobot(robot: RobotEntity): boolean {
  return robot.health > 0;
}

/**
 * Filters a list of robots to return only active (alive) ones.
 *
 * @param robots - Array of robot entities
 * @returns Array containing only robots with health > 0
 */
export function getActiveRobots(robots: RobotEntity[]): RobotEntity[] {
  return robots.filter(isActiveRobot);
}

/**
 * Checks if a robot belongs to a specific team.
 *
 * @param robot - The robot entity to check
 * @param teamId - The team ID to compare against
 * @returns true if the robot is on the specified team
 */
export function isOnTeam(robot: RobotEntity, teamId: string): boolean {
  return robot.team === teamId;
}
