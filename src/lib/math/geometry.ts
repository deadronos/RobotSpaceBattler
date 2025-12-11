import { Vec3, vec3 } from "./vec3";

/**
 * Calculates the closest point on an Axis-Aligned Bounding Box (AABB) to a given point.
 * Computations are performed in the XZ plane. Y component of the result is same as input point.
 *
 * @param point - The query point.
 * @param center - The center of the AABB.
 * @param halfWidth - Half of the AABB's width (X axis).
 * @param halfDepth - Half of the AABB's depth (Z axis).
 * @returns The closest point on the AABB.
 */
export function closestPointOnAABB(
  point: Vec3,
  center: Vec3,
  halfWidth: number,
  halfDepth: number,
): Vec3 {
  const minX = center.x - halfWidth;
  const maxX = center.x + halfWidth;
  const minZ = center.z - halfDepth;
  const maxZ = center.z + halfDepth;

  const x = Math.max(minX, Math.min(point.x, maxX));
  const z = Math.max(minZ, Math.min(point.z, maxZ));

  return vec3(x, point.y, z);
}

/**
 * Calculates the squared distance from a point to an AABB in the XZ plane.
 *
 * @param point - The query point.
 * @param center - The center of the AABB.
 * @param halfWidth - Half of the AABB's width.
 * @param halfDepth - Half of the AABB's depth.
 * @returns The squared distance.
 */
export function distanceSquaredPointToAABB(
  point: Vec3,
  center: Vec3,
  halfWidth: number,
  halfDepth: number,
): number {
  const closest = closestPointOnAABB(point, center, halfWidth, halfDepth);
  const dx = point.x - closest.x;
  const dz = point.z - closest.z;
  return dx * dx + dz * dz;
}

/**
 * Calculates the closest point on the perimeter of a circle (or cylinder) to a given point.
 * Computations are performed in the XZ plane. Y component is preserved.
 * If the point is inside the circle, the closest point is the point itself (or projected to edge? Standard behavior is point itself for "disk", edge for "circle perimeter").
 * However, usually for collision resolution we want the point on the surface.
 *
 * @param point - The query point.
 * @param center - The center of the circle.
 * @param radius - The radius of the circle.
 * @returns The closest point on the circle.
 */
export function closestPointOnCircle(
  point: Vec3,
  center: Vec3,
  radius: number,
): Vec3 {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  const distSq = dx * dx + dz * dz;

  if (distSq < Number.EPSILON) {
    // Point is at center, return center + radius in arbitrary direction (e.g. X)
    return vec3(center.x + radius, point.y, center.z);
  }

  // If point is inside, do we return point or projection?
  // Usually "closest point on shape" implies if inside, it's the point itself.
  // But for "closest point on perimeter" it's different.
  // Let's implement "closest point on disk" (solid circle).
  if (distSq <= radius * radius) {
    return vec3(point.x, point.y, point.z);
  }

  const dist = Math.sqrt(distSq);
  const scale = radius / dist;

  return vec3(center.x + dx * scale, point.y, center.z + dz * scale);
}

/**
 * Calculates the squared distance from a point to a circle (disk) in the XZ plane.
 * returns 0 if inside.
 */
export function distanceSquaredPointToCircle(
  point: Vec3,
  center: Vec3,
  radius: number,
): number {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  const distSq = dx * dx + dz * dz;
  const radiusSq = radius * radius;

  if (distSq <= radiusSq) return 0;

  const dist = Math.sqrt(distSq);
  const gap = dist - radius;
  return gap * gap;
}
