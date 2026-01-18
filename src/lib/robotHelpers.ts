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

/**
 * Checks if the target is an enemy of the seeker.
 * Evaluates team difference, active status, and self-exclusion.
 *
 * @param seeker - The robot looking at the target.
 * @param target - The target robot.
 * @returns True if the target is a valid enemy.
 */
export function isEnemy(seeker: RobotEntity, target: RobotEntity): boolean {
  return (
    target.team !== seeker.team &&
    isActiveRobot(target) &&
    target.id !== seeker.id
  );
}

/**
 * Checks if the target is an ally of the seeker.
 * Evaluates team match, active status, and self-exclusion.
 *
 * @param seeker - The robot looking at the target.
 * @param target - The target robot.
 * @returns True if the target is a valid ally.
 */
export function isAlly(seeker: RobotEntity, target: RobotEntity): boolean {
  return (
    target.team === seeker.team &&
    isActiveRobot(target) &&
    target.id !== seeker.id
  );
}
