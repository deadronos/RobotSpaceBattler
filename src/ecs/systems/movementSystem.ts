import {
  closestPointOnAABB,
  distanceSquaredPointToAABB,
} from '../../lib/math/geometry';
import {
  addInPlaceVec3,
  clampVec3,
  distanceVec3,
  lengthVec3,
  scaleInPlaceVec3,
  scaleVec3,
  Vec3,
  vec3,
} from '../../lib/math/vec3';
import {
  ARENA_BOUNDS,
  ARENA_PILLARS,
  ARENA_WALLS,
  ROBOT_RADIUS,
} from '../../simulation/environment/arenaGeometry';
import { BattleWorld } from '../world';

const FRICTION = 0.92;
const { min: MIN_BOUNDS, max: MAX_BOUNDS } = ARENA_BOUNDS;

function resolveCollision(pos: Vec3): void {
  // Check walls
  for (const wall of ARENA_WALLS) {
    const wallCenter = vec3(wall.x, 0, wall.z);

    // Check for collision using squared distance for efficiency
    if (distanceSquaredPointToAABB(pos, wallCenter, wall.halfWidth, wall.halfDepth) < ROBOT_RADIUS * ROBOT_RADIUS) {
      // Resolve collision
      const closest = closestPointOnAABB(pos, wallCenter, wall.halfWidth, wall.halfDepth);
      const dist = distanceVec3(pos, closest);

      if (dist > 0) {
        const pushDist = ROBOT_RADIUS - dist;
        const dx = pos.x - closest.x;
        const dz = pos.z - closest.z;
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

    const dx = pos.x - pillarCenter.x;
    const dz = pos.z - pillarCenter.z;
    const distSq = dx * dx + dz * dz;

    if (distSq < combinedRadius * combinedRadius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0) {
        const pushDist = combinedRadius - dist;
        pos.x += (dx / dist) * pushDist;
        pos.z += (dz / dist) * pushDist;
      }
    }
  }
}

/**
 * Updates the movement physics for all robots.
 * Handles velocity application, friction, and collision resolution with the environment.
 *
 * @param world - The battle world state.
 * @param deltaSeconds - The time elapsed since the last update in seconds.
 */
export function updateMovementSystem(world: BattleWorld, deltaSeconds: number): void {
  const { robots } = world;

  robots.entities.forEach((robot) => {
    robot.fireCooldown = Math.max(0, robot.fireCooldown - deltaSeconds);

    const multiplier = robot.slowMultiplier ?? 1;
    const displacement = scaleVec3(robot.velocity, deltaSeconds * multiplier);
    addInPlaceVec3(robot.position, displacement);

    // Apply collision detection
    resolveCollision(robot.position);

    clampVec3(robot.position, MIN_BOUNDS, MAX_BOUNDS);
    robot.position.y = 0;

    scaleInPlaceVec3(robot.velocity, FRICTION);
    robot.speed = lengthVec3(robot.velocity) * multiplier;
  });
}
