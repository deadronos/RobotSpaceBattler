import {
  addVec3,
  distance,
  normalize,
  scaleVec3,
  subVec3,
} from "../../ecs/utils/vector";
import { RobotEntity, Vec3 } from "../../ecs/world";
import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { RobotBehaviorMode } from "./behaviorState";

export interface PathingConfig {
  baseSpeed: number;
  retreatSpeedMultiplier: number;
  anchorSpeed: number;
  velocityDamping: number;
  engageDistance: number;
}

const DEFAULT_PATHING: PathingConfig = {
  baseSpeed: 6,
  retreatSpeedMultiplier: 1.25,
  anchorSpeed: 2.5,
  velocityDamping: 0.9,
  engageDistance: 10,
};

export type PathingSnapshot = Pick<
  RobotEntity,
  "position" | "velocity" | "team" | "orientation" | "isCaptain"
>;

export type TargetSnapshot = Pick<
  RobotEntity,
  "id" | "position" | "team" | "isCaptain"
>;

export interface MovementPlan {
  velocity: Vec3;
  orientation: number;
}

function directionTowards(origin: Vec3, target: Vec3): Vec3 {
  return normalize(subVec3(target, origin));
}

export function planRobotMovement(
  robot: PathingSnapshot,
  mode: RobotBehaviorMode,
  target: TargetSnapshot | undefined,
  config: PathingConfig = DEFAULT_PATHING,
): MovementPlan {
  const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;
  let desiredVelocity = scaleVec3(robot.velocity, config.velocityDamping);
  let orientation = robot.orientation;

  if (target) {
    const targetDirection = directionTowards(robot.position, target.position);
    orientation = Math.atan2(
      target.position.x - robot.position.x,
      target.position.z - robot.position.z,
    );

    if (mode === RobotBehaviorMode.Retreat) {
      const retreatDirection = directionTowards(robot.position, spawnCenter);
      desiredVelocity = scaleVec3(
        retreatDirection,
        config.baseSpeed * config.retreatSpeedMultiplier,
      );
    } else if (mode === RobotBehaviorMode.Engage) {
      const currentDistance = distance(robot.position, target.position);
      if (currentDistance > config.engageDistance) {
        desiredVelocity = scaleVec3(targetDirection, config.baseSpeed);
      } else {
        desiredVelocity = scaleVec3(targetDirection, 0);
      }
    } else {
      desiredVelocity = scaleVec3(targetDirection, config.baseSpeed);
    }
  } else {
    const anchorDirection = directionTowards(robot.position, spawnCenter);
    desiredVelocity = scaleVec3(anchorDirection, config.anchorSpeed);
    orientation = Math.atan2(
      spawnCenter.x - robot.position.x,
      spawnCenter.z - robot.position.z,
    );
  }

  return {
    velocity: desiredVelocity,
    orientation,
  };
}

export function integrateMovement(
  position: Vec3,
  velocity: Vec3,
  deltaSeconds: number,
): Vec3 {
  return addVec3(position, scaleVec3(velocity, deltaSeconds));
}
