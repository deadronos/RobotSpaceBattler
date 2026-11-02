import type { Object3D } from "three";

import type { RobotEntity } from "../../ecs/worldTypes";
import { ROBOT_CENTER_Y } from "./robotLayout";

/**
 * Projects one robot's ECS transform onto a reusable object (#168).
 *
 * The ECS is the single owner of robot positions; the scene graph is a pure
 * projection of it. There is no physics body for robots to keep in sync (#184).
 *
 * @param target - Reusable Object3D whose matrix is written by the caller.
 * @param robot - The ECS entity to project.
 */
export function writeRobotMatrix(
  target: Object3D,
  robot: Pick<RobotEntity, "position" | "orientation">,
): void {
  target.position.set(robot.position.x, ROBOT_CENTER_Y, robot.position.z);
  target.rotation.set(0, robot.orientation, 0);
  target.scale.set(1, 1, 1);
  target.updateMatrix();
}
