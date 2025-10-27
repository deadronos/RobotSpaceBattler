import {
  addVec3,
  distance,
  lengthSq,
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

interface MovementOptions {
  formationAnchor?: Vec3 | null;
  neighbors?: Vec3[];
  strafeSign?: 1 | -1;
}

const SEPARATION_RADIUS = 1.5;
const SEPARATION_WEIGHT = 0.6;
const STRAFE_DISTANCE_THRESHOLD = 2.25;
const STRAFE_WEIGHT = 0.45;

function computeSeparationDirection(
  position: Vec3,
  neighbors: Vec3[],
  radius: number,
): Vec3 {
  if (neighbors.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  let steering = { x: 0, y: 0, z: 0 };
  let count = 0;
  const radiusSq = radius * radius;

  neighbors.forEach((neighbor) => {
    const offset = subVec3(position, neighbor);
    const distSq = lengthSq(offset);

    if (distSq > 0 && distSq < radiusSq) {
      const dist = Math.sqrt(distSq);
      const strength = (radius - dist) / radius;
      const direction = scaleVec3(offset, 1 / dist);
      steering = addVec3(steering, scaleVec3(direction, strength));
      count += 1;
    }
  });

  if (count === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const averaged = scaleVec3(steering, 1 / count);
  return normalize(averaged);
}

function perpendicularXZ(direction: Vec3, sign: 1 | -1): Vec3 {
  if (lengthSq(direction) === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return normalize({
    x: direction.z * sign,
    y: 0,
    z: -direction.x * sign,
  });
}

export function planRobotMovement(
  robot: PathingSnapshot,
  mode: RobotBehaviorMode,
  target: TargetSnapshot | undefined,
  config: PathingConfig = DEFAULT_PATHING,
  options: MovementOptions = {},
): MovementPlan {
  const spawnCenter = TEAM_CONFIGS[robot.team].spawnCenter;
  let desiredVelocity = scaleVec3(robot.velocity, config.velocityDamping);
  let orientation = robot.orientation;
  const formationAnchor = options.formationAnchor ?? null;
  const neighbors = options.neighbors ?? [];
  const strafeSign = options.strafeSign ?? 1;

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

    if (formationAnchor && mode !== RobotBehaviorMode.Retreat) {
      const anchorDirection = directionTowards(
        robot.position,
        formationAnchor,
      );
      const anchorDistance = distance(robot.position, formationAnchor);

      if (anchorDistance > STRAFE_DISTANCE_THRESHOLD) {
        desiredVelocity = scaleVec3(anchorDirection, config.baseSpeed);
        orientation = Math.atan2(
          formationAnchor.x - robot.position.x,
          formationAnchor.z - robot.position.z,
        );
      } else {
        const strafeDirection = perpendicularXZ(targetDirection, strafeSign);
        if (lengthSq(strafeDirection) > 0) {
          const combined = normalize(
            addVec3(
              scaleVec3(targetDirection, 1 - STRAFE_WEIGHT),
              scaleVec3(strafeDirection, STRAFE_WEIGHT),
            ),
          );
          desiredVelocity = scaleVec3(combined, config.baseSpeed);
        } else {
          desiredVelocity = scaleVec3(targetDirection, config.baseSpeed);
        }
        orientation = Math.atan2(
          target.position.x - robot.position.x,
          target.position.z - robot.position.z,
        );
      }
    }
  } else {
    const anchorTarget = formationAnchor ?? spawnCenter;
    const anchorDirection = directionTowards(robot.position, anchorTarget);
    desiredVelocity = scaleVec3(anchorDirection, config.anchorSpeed);
    orientation = Math.atan2(
      anchorTarget.x - robot.position.x,
      anchorTarget.z - robot.position.z,
    );
  }

  if (neighbors.length > 0) {
    const separationDirection = computeSeparationDirection(
      robot.position,
      neighbors,
      SEPARATION_RADIUS,
    );

    if (lengthSq(separationDirection) > 0) {
      const separationVelocity = scaleVec3(
        separationDirection,
        config.baseSpeed * SEPARATION_WEIGHT,
      );
      desiredVelocity = addVec3(desiredVelocity, separationVelocity);

      if (!target) {
        orientation = Math.atan2(
          desiredVelocity.x,
          desiredVelocity.z,
        );
      }
    }
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
