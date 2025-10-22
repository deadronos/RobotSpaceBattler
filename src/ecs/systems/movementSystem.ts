import { TEAM_CONFIGS } from "../../lib/teamConfig";
import {
  addVec3,
  distance,
  normalize,
  scaleVec3,
  subVec3,
} from "../utils/vector";
import { BattleWorld, RobotEntity, Vec3 } from "../world";

const baseSpeed = 6;
const retreatSpeedMultiplier = 1.25;

function computeDesiredVelocity(robot: RobotEntity, target: Vec3): Vec3 {
  const direction = normalize(subVec3(target, robot.position));
  return scaleVec3(direction, baseSpeed);
}

export function updateMovementSystem(
  world: BattleWorld,
  deltaSeconds: number,
): void {
  const robots = world.robots.entities;

  robots.forEach((robot: RobotEntity) => {
    if (robot.health <= 0) {
      return;
    }

    let desiredVelocity: Vec3 = scaleVec3(robot.velocity, 0.9);

    if (robot.ai.targetId) {
      const target = robots.find(
        (candidate) => candidate.id === robot.ai.targetId,
      );

      if (target) {
        if (robot.ai.mode === "retreat") {
          const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;
          desiredVelocity = scaleVec3(
            computeDesiredVelocity(robot, spawnCenter),
            retreatSpeedMultiplier,
          );
        } else if (robot.ai.mode === "engage") {
          const offset = subVec3(target.position, robot.position);
          const desiredDistance = 10;
          const currentDistance = distance(robot.position, target.position);
          if (currentDistance > desiredDistance) {
            desiredVelocity = computeDesiredVelocity(robot, target.position);
          } else {
            desiredVelocity = scaleVec3(normalize(offset), 0);
          }
        } else {
          desiredVelocity = computeDesiredVelocity(robot, target.position);
        }

        const orientation = Math.atan2(
          target.position.x - robot.position.x,
          target.position.z - robot.position.z,
        );
        robot.orientation = orientation;
      }
    } else {
      const anchor = TEAM_CONFIGS[robot.team].spawnCenter;
      desiredVelocity = scaleVec3(
        normalize(subVec3(anchor, robot.position)),
        2.5,
      );
    }

    robot.velocity = desiredVelocity;
    robot.position = addVec3(
      robot.position,
      scaleVec3(robot.velocity, deltaSeconds),
    );
  });
}
