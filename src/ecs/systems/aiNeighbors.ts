import { cloneVec3, distanceVec3, Vec3 } from '../../lib/math/vec3';
import { RobotEntity } from '../world';

export function buildNeighbors(robot: RobotEntity, allies: RobotEntity[]): Vec3[] {
  return allies
    .filter((ally) => ally.id !== robot.id)
    .filter((ally) => distanceVec3(ally.position, robot.position) < 2.5)
    .map((ally) => cloneVec3(ally.position));
}
