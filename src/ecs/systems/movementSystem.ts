import {
  closestPointOnAABBInPlace,
  distanceSquaredPointToAABB,
  distanceSquaredXZ,
  segmentIntersectsAABB,
  segmentIntersectsCircle,
} from "../../lib/math/geometry";
import {
  addInPlaceVec3,
  clampVec3,
  cloneVec3,
  distanceVec3,
  lengthVec3,
  scaleInPlaceVec3,
  scaleVec3,
  Vec3,
  vec3,
} from "../../lib/math/vec3";
import {
  ARENA_BOUNDS,
  ARENA_PILLARS,
  ARENA_WALLS,
  ROBOT_RADIUS,
} from "../../simulation/environment/arenaGeometry";
import { BattleWorld } from "../world";

const FRICTION = 0.92;
const { min: MIN_BOUNDS, max: MAX_BOUNDS } = ARENA_BOUNDS;
const scratchClosest = vec3(0, 0, 0);

function resolveStaticCollision(pos: Vec3): void {
  // Check walls
  for (const wall of ARENA_WALLS) {
    const wallCenter = vec3(wall.x, 0, wall.z);

    // Check for collision using squared distance for efficiency
    if (
      distanceSquaredPointToAABB(
        pos,
        wallCenter,
        wall.halfWidth,
        wall.halfDepth,
      ) <
      ROBOT_RADIUS * ROBOT_RADIUS
    ) {
      // Resolve collision
      closestPointOnAABBInPlace(
        pos,
        wallCenter,
        wall.halfWidth,
        wall.halfDepth,
        scratchClosest,
      );
      const dist = distanceVec3(pos, scratchClosest);

      if (dist > 0) {
        const pushDist = ROBOT_RADIUS - dist;
        const dx = pos.x - scratchClosest.x;
        const dz = pos.z - scratchClosest.z;
        // Normalize and scale
        pos.x += (dx / dist) * pushDist;
        pos.z += (dz / dist) * pushDist;
      }
    }
  }

  // Check pillars
  for (const pillar of ARENA_PILLARS) {
    const pillarCenter = vec3(pillar.x, 0, pillar.z);
    const combinedRadius = pillar.radius + ROBOT_RADIUS;

    const distSq = distanceSquaredXZ(pos, pillarCenter);

    if (distSq < combinedRadius * combinedRadius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0) {
        const dx = pos.x - pillarCenter.x;
        const dz = pos.z - pillarCenter.z;
        const pushDist = combinedRadius - dist;
        pos.x += (dx / dist) * pushDist;
        pos.z += (dz / dist) * pushDist;
      }
    }
  }
}

function isBlockedByDynamicObstacle(
  start: Vec3,
  end: Vec3,
  world: BattleWorld,
): boolean {
  for (const obstacle of world.obstacles.entities) {
    if (!obstacle.blocksMovement) continue;
    if (obstacle.active === false) continue;
    if (!obstacle.shape) continue;

    const obstacleCenter = vec3(
      obstacle.shape.center?.x ?? obstacle.position.x,
      0,
      obstacle.shape.center?.z ?? obstacle.position.z,
    );

    if (obstacle.shape.kind === "circle") {
      const combinedRadius = obstacle.shape.radius + ROBOT_RADIUS;
      if (
        segmentIntersectsCircle(start, end, obstacleCenter, combinedRadius) ||
        distanceSquaredXZ(end, obstacleCenter) < combinedRadius * combinedRadius
      ) {
        return true;
      }
    } else if (obstacle.shape.kind === "box") {
      const halfWidth = obstacle.shape.halfWidth + ROBOT_RADIUS;
      const halfDepth = obstacle.shape.halfDepth + ROBOT_RADIUS;

      if (
        segmentIntersectsAABB(start, end, obstacleCenter, halfWidth, halfDepth) ||
        distanceSquaredPointToAABB(end, obstacleCenter, halfWidth, halfDepth) <= 0
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Updates the movement physics for all robots.
 * Handles velocity application, friction, and collision resolution with the environment.
 *
 * @param world - The battle world state.
 * @param deltaSeconds - The time elapsed since the last update in seconds.
 */
export function updateMovementSystem(
  world: BattleWorld,
  deltaSeconds: number,
): void {
  const { robots } = world;

  robots.entities.forEach((robot) => {
    const previousPosition = cloneVec3(robot.position);
    const multiplier = robot.slowMultiplier ?? 1;
    const displacement = scaleVec3(robot.velocity, deltaSeconds * multiplier);
    addInPlaceVec3(robot.position, displacement);

    if (isBlockedByDynamicObstacle(previousPosition, robot.position, world)) {
      robot.position.x = previousPosition.x;
      robot.position.z = previousPosition.z;
    } else {
      // Apply collision detection
      resolveStaticCollision(robot.position);
    }

    clampVec3(robot.position, MIN_BOUNDS, MAX_BOUNDS);
    robot.position.y = 0;

    scaleInPlaceVec3(robot.velocity, FRICTION);
    robot.speed = lengthVec3(robot.velocity) * multiplier;
  });
}
