import {
  addInPlaceVec3,
  clampVec3,
  lengthVec3,
  scaleInPlaceVec3,
  scaleVec3,
  vec3,
  Vec3,
} from '../../lib/math/vec3';
import { BattleWorld } from '../world';

const MIN_BOUNDS = vec3(-48, 0, -48);
const MAX_BOUNDS = vec3(48, 0, 48);
const FRICTION = 0.92;
const ROBOT_RADIUS = 1.0;

// Wall definitions matching SpaceStation.tsx
const WALLS = [
  // Outer perimeter
  { x: 0, z: -50, halfWidth: 50, halfDepth: 1 },
  { x: 0, z: 50, halfWidth: 50, halfDepth: 1 },
  { x: 50, z: 0, halfWidth: 1, halfDepth: 50 },
  { x: -50, z: 0, halfWidth: 1, halfDepth: 50 },
  // Internal corridors
  { x: 0, z: -20, halfWidth: 20, halfDepth: 0.75 },
  { x: 0, z: 20, halfWidth: 20, halfDepth: 0.75 },
  { x: -20, z: 0, halfWidth: 0.75, halfDepth: 15 },
  { x: 20, z: 0, halfWidth: 0.75, halfDepth: 15 },
  // Central obstacle
  { x: 0, z: 0, halfWidth: 3, halfDepth: 3 },
  // Corner structures
  { x: -35, z: -35, halfWidth: 3, halfDepth: 3 },
  { x: 35, z: -35, halfWidth: 3, halfDepth: 3 },
  { x: -35, z: 35, halfWidth: 3, halfDepth: 3 },
  { x: 35, z: 35, halfWidth: 3, halfDepth: 3 },
];

const PILLARS = [
  { x: -30, z: -30, radius: 1.2 },
  { x: 30, z: -30, radius: 1.2 },
  { x: -30, z: 30, radius: 1.2 },
  { x: 30, z: 30, radius: 1.2 },
];

function checkBoxCollision(
  pos: Vec3,
  boxX: number,
  boxZ: number,
  halfWidth: number,
  halfDepth: number,
  radius: number,
): boolean {
  const closestX = Math.max(boxX - halfWidth, Math.min(pos.x, boxX + halfWidth));
  const closestZ = Math.max(boxZ - halfDepth, Math.min(pos.z, boxZ + halfDepth));
  const distanceX = pos.x - closestX;
  const distanceZ = pos.z - closestZ;
  return distanceX * distanceX + distanceZ * distanceZ < radius * radius;
}

function checkCircleCollision(
  pos: Vec3,
  circleX: number,
  circleZ: number,
  circleRadius: number,
  robotRadius: number,
): boolean {
  const dx = pos.x - circleX;
  const dz = pos.z - circleZ;
  const combinedRadius = circleRadius + robotRadius;
  return dx * dx + dz * dz < combinedRadius * combinedRadius;
}

function resolveCollision(pos: Vec3): void {
  // Check walls
  for (const wall of WALLS) {
    if (checkBoxCollision(pos, wall.x, wall.z, wall.halfWidth, wall.halfDepth, ROBOT_RADIUS)) {
      // Push robot out of wall
      const closestX = Math.max(
        wall.x - wall.halfWidth,
        Math.min(pos.x, wall.x + wall.halfWidth),
      );
      const closestZ = Math.max(
        wall.z - wall.halfDepth,
        Math.min(pos.z, wall.z + wall.halfDepth),
      );
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0) {
        const pushDist = ROBOT_RADIUS - dist;
        pos.x += (dx / dist) * pushDist;
        pos.z += (dz / dist) * pushDist;
      }
    }
  }

  // Check pillars
  for (const pillar of PILLARS) {
    if (checkCircleCollision(pos, pillar.x, pillar.z, pillar.radius, ROBOT_RADIUS)) {
      const dx = pos.x - pillar.x;
      const dz = pos.z - pillar.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0) {
        const combinedRadius = pillar.radius + ROBOT_RADIUS;
        const pushDist = combinedRadius - dist;
        pos.x += (dx / dist) * pushDist;
        pos.z += (dz / dist) * pushDist;
      }
    }
  }
}

export function updateMovementSystem(world: BattleWorld, deltaSeconds: number): void {
  const { robots } = world;

  robots.entities.forEach((robot) => {
    robot.fireCooldown = Math.max(0, robot.fireCooldown - deltaSeconds);

    const displacement = scaleVec3(robot.velocity, deltaSeconds);
    addInPlaceVec3(robot.position, displacement);

    // Apply collision detection
    resolveCollision(robot.position);

    clampVec3(robot.position, MIN_BOUNDS, MAX_BOUNDS);
    robot.position.y = 0;

    scaleInPlaceVec3(robot.velocity, FRICTION);
    robot.speed = lengthVec3(robot.velocity);
  });
}
