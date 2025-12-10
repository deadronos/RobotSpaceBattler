import { closestPointOnAABB } from "../../../lib/math/geometry";
import {
  addVec3,
  distanceVec3,
  normalizeVec3,
  scaleVec3,
  Vec3,
  vec3,
} from "../../../lib/math/vec3";
import {
  ARENA_PILLARS,
  ARENA_WALLS,
  ROBOT_RADIUS,
} from "../../environment/arenaGeometry";

/** Reactive avoidance detection radius (increased for better wall awareness) */
export const AVOIDANCE_RADIUS = 4.5;

type RuntimeObstacle = {
  position?: { x: number; y: number; z: number };
  shape?:
    | { kind: "circle"; radius: number }
    | { kind: "box"; halfWidth: number; halfDepth: number };
  blocksMovement?: boolean;
  blocksVision?: boolean;
};

/**
 * Computes an avoidance force vector based on proximity to static obstacles.
 * Uses a simple reactive model: if close to a wall/pillar, push away.
 *
 * @param pos - The current position of the entity.
 * @returns A force vector to steer away from obstacles.
 */
export function computeAvoidance(
  pos: Vec3,
  obstacles?: Array<RuntimeObstacle | null>,
): Vec3 {
  let avoid = vec3(0, 0, 0);

  for (const wall of ARENA_WALLS) {
    const wallCenter = vec3(wall.x, 0, wall.z);
    // Expand the wall bounds by robot radius to ensure we steer clear of the physical boundary
    const closest = closestPointOnAABB(
      pos,
      wallCenter,
      wall.halfWidth + ROBOT_RADIUS,
      wall.halfDepth + ROBOT_RADIUS,
    );

    const dist = distanceVec3(pos, closest);

    if (dist < AVOIDANCE_RADIUS) {
      const strength =
        (AVOIDANCE_RADIUS - Math.max(dist, 0)) / AVOIDANCE_RADIUS;
      let pushDir: Vec3;

      if (dist > 1e-6) {
        // Push away from the closest point on the (expanded) wall
        const dx = pos.x - closest.x;
        const dz = pos.z - closest.z;
        pushDir = normalizeVec3({ x: dx, y: 0, z: dz });
      } else {
        // Inside the expanded wall, push away from wall center
        pushDir = normalizeVec3({ x: pos.x - wall.x, y: 0, z: pos.z - wall.z });
      }
      avoid = addVec3(avoid, scaleVec3(pushDir, strength));
    }
  }

  for (const pillar of ARENA_PILLARS) {
    const pillarCenter = vec3(pillar.x, 0, pillar.z);
    const distToCenter = distanceVec3(pos, pillarCenter);
    const dist = distToCenter - (pillar.radius + ROBOT_RADIUS);

    if (dist < AVOIDANCE_RADIUS) {
      const strength =
        (AVOIDANCE_RADIUS - Math.max(dist, 0)) / AVOIDANCE_RADIUS;
      const dx = pos.x - pillar.x;
      const dz = pos.z - pillar.z;
      const push = normalizeVec3({ x: dx, y: 0, z: dz });
      avoid = addVec3(avoid, scaleVec3(push, strength));
    }
  }

  // Consider runtime obstacles if provided
  if (obstacles && obstacles.length > 0) {
    for (const obs of obstacles) {
      if (!obs || !obs.shape) continue;
      const obsPos = obs.position ?? { x: 0, y: 0, z: 0 };

      if (obs.shape.kind === "circle") {
        const dx = pos.x - obsPos.x;
        const dz = pos.z - obsPos.z;
        const distToCenter = Math.sqrt(dx * dx + dz * dz);
        const dist = distToCenter - ((obs.shape.radius ?? 0) + ROBOT_RADIUS);
        if (dist < AVOIDANCE_RADIUS) {
          const strength =
            (AVOIDANCE_RADIUS - Math.max(dist, 0)) / AVOIDANCE_RADIUS;
          const push = normalizeVec3({ x: dx, y: 0, z: dz });
          avoid = addVec3(avoid, scaleVec3(push, strength));
        }
      } else if (obs.shape.kind === "box") {
        const closest = closestPointOnAABB(
          pos,
          { x: obsPos.x, y: 0, z: obsPos.z },
          (obs.shape.halfWidth ?? 0) + ROBOT_RADIUS,
          (obs.shape.halfDepth ?? 0) + ROBOT_RADIUS,
        );

        const dist = distanceVec3(pos, closest);

        if (dist < AVOIDANCE_RADIUS) {
          const strength =
            (AVOIDANCE_RADIUS - Math.max(dist, 0)) / AVOIDANCE_RADIUS;
          let pushDir: Vec3;

          if (dist > 1e-6) {
            const dx = pos.x - closest.x;
            const dz = pos.z - closest.z;
            pushDir = normalizeVec3({ x: dx, y: 0, z: dz });
          } else {
            pushDir = normalizeVec3({
              x: pos.x - obsPos.x,
              y: 0,
              z: pos.z - obsPos.z,
            });
          }

          avoid = addVec3(avoid, scaleVec3(pushDir, strength));
        }
      }
    }
  }

  return avoid;
}
