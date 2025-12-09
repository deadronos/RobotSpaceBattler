import { cloneVec3, distanceVec3, Vec3 } from '../../lib/math/vec3';
import { RobotEntity } from '../world';

/**
 * Identifies nearby allied robots to assist with flocking/formation behavior.
 *
 * @param robot - The robot looking for neighbors.
 * @param allies - The list of all allied robots.
 * @returns An array of positions of nearby allies (within 2.5 units).
 */
export function buildNeighbors(robot: RobotEntity, allies: RobotEntity[]): Vec3[] {
  return allies
    .filter((ally) => ally.id !== robot.id)
    .filter((ally) => distanceVec3(ally.position, robot.position) < 2.5)
    .map((ally) => cloneVec3(ally.position));
}
