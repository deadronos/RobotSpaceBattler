import { addVec3, normalizeVec3, scaleVec3, Vec3, vec3 } from '../../../lib/math/vec3';
import { ARENA_PILLARS, ARENA_WALLS, ROBOT_RADIUS } from '../../environment/arenaGeometry';

const AVOIDANCE_RADIUS = 3.0;

export function computeAvoidance(pos: Vec3): Vec3 {
  let avoid = vec3(0, 0, 0);

  for (const wall of ARENA_WALLS) {
    const minX = wall.x - wall.halfWidth - ROBOT_RADIUS;
    const maxX = wall.x + wall.halfWidth + ROBOT_RADIUS;
    const minZ = wall.z - wall.halfDepth - ROBOT_RADIUS;
    const maxZ = wall.z + wall.halfDepth + ROBOT_RADIUS;

    const closestX = Math.max(minX, Math.min(pos.x, maxX));
    const closestZ = Math.max(minZ, Math.min(pos.z, maxZ));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < AVOIDANCE_RADIUS) {
      const strength = (AVOIDANCE_RADIUS - Math.max(dist, 0)) / AVOIDANCE_RADIUS;
      let pushDir: Vec3;
      if (dist > 1e-6) {
        pushDir = normalizeVec3({ x: dx, y: 0, z: dz });
      } else {
        pushDir = normalizeVec3({ x: pos.x - wall.x, y: 0, z: pos.z - wall.z });
      }
      avoid = addVec3(avoid, scaleVec3(pushDir, strength));
    }
  }

  for (const pillar of ARENA_PILLARS) {
    const dx = pos.x - pillar.x;
    const dz = pos.z - pillar.z;
    const dist = Math.sqrt(dx * dx + dz * dz) - (pillar.radius + ROBOT_RADIUS);
    if (dist < AVOIDANCE_RADIUS) {
      const strength = (AVOIDANCE_RADIUS - Math.max(dist, 0)) / AVOIDANCE_RADIUS;
      const push = normalizeVec3({ x: dx, y: 0, z: dz });
      avoid = addVec3(avoid, scaleVec3(push, strength));
    }
  }

  return avoid;
}
