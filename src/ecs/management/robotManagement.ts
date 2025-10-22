/**
 * Robot Management Utilities
 *
 * Provides functions for manipulating robot properties within the simulation world.
 * Includes health/kills management and position setting.
 *
 * Used by: world.ts public API (setRobotHealth, setRobotKills, setRobotPosition)
 */

import type { Vector3 } from "../../types";
import type { Robot } from "../entities/Robot";
import { setRobotBodyPosition } from "../simulation/physics";
import { refreshTeamStats } from "../simulation/teamStats";
import { cloneVector } from "../utils/vector";
import type { SimulationWorld } from "../world";

/**
 * Finds a robot by ID in the world entity list.
 *
 * @param world The simulation world
 * @param robotId ID of the robot to find
 * @returns The robot if found, undefined otherwise
 */
function findRobot(world: SimulationWorld, robotId: string): Robot | undefined {
  return world.entities.find((robot) => robot.id === robotId);
}

/**
 * Refreshes statistics for a single team.
 *
 * @param world The simulation world
 * @param team Team name ("red" or "blue")
 */
function refreshTeam(world: SimulationWorld, team: "red" | "blue"): void {
  refreshTeamStats(world, [team]);
}

/**
 * Sets a robot's health with automatic clamping to valid range and captain status updates.
 * If health reaches 0, robot is removed from captaincy.
 *
 * @param world The simulation world
 * @param robotId ID of the robot
 * @param health New health value (will be clamped to 0-maxHealth)
 */
export function setRobotHealth(
  world: SimulationWorld,
  robotId: string,
  health: number,
): void {
  const robot = findRobot(world, robotId);
  if (!robot) {
    return;
  }
  const clamped = Math.max(0, Math.min(robot.maxHealth, health));
  robot.health = clamped;
  if (clamped <= 0) {
    robot.isCaptain = false;
  }
  refreshTeam(world, robot.team);
}

/**
 * Sets a robot's kill count, ensuring non-negative values.
 *
 * @param world The simulation world
 * @param robotId ID of the robot
 * @param kills New kill count (negative values clamped to 0)
 */
export function setRobotKills(
  world: SimulationWorld,
  robotId: string,
  kills: number,
): void {
  const robot = findRobot(world, robotId);
  if (!robot) {
    return;
  }
  robot.stats.kills = Math.max(0, kills);
}

/**
 * Sets a robot's position in both the world and physics engine.
 * Creates a clone of the position to prevent external mutations.
 *
 * @param world The simulation world
 * @param robotId ID of the robot
 * @param position New world position
 */
export function setRobotPosition(
  world: SimulationWorld,
  robotId: string,
  position: Vector3,
): void {
  const robot = findRobot(world, robotId);
  if (!robot) {
    return;
  }
  robot.position = cloneVector(position);
  setRobotBodyPosition(world.physics, robot, robot.position);
}
