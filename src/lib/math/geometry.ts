import { Vec3, vec3 } from "./vec3";

/**
 * Interface representing a 2D point (x, z).
 * Compatible with Vec3.
 */
export interface Point2D {
  x: number;
  z: number;
}

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

/**
 * Calculates the squared distance from a point to a line segment in the XZ plane.
 *
 * @param p - The query point.
 * @param v - The first endpoint of the segment.
 * @param w - The second endpoint of the segment.
 * @returns The squared distance.
 */
export function distanceSquaredPointToSegment(
  p: Point2D,
  v: Point2D,
  w: Point2D,
): number {
  const l2 = (v.x - w.x) ** 2 + (v.z - w.z) ** 2;
  if (l2 === 0) return (p.x - v.x) ** 2 + (p.z - v.z) ** 2;

  let t = ((p.x - v.x) * (w.x - v.x) + (p.z - v.z) * (w.z - v.z)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projectionX = v.x + t * (w.x - v.x);
  const projectionZ = v.z + t * (w.z - v.z);

  return (p.x - projectionX) ** 2 + (p.z - projectionZ) ** 2;
}

/**
 * Checks if a point is inside a polygon in the XZ plane using ray casting.
 *
 * @param point - The query point.
 * @param vertices - The vertices of the polygon.
 * @returns True if the point is inside the polygon.
 */
export function isPointInPolygon(
  point: Point2D,
  vertices: readonly Point2D[],
): boolean {
  let inside = false;

  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x;
    const zi = vertices[i].z;
    const xj = vertices[j].x;
    const zj = vertices[j].z;

    const intersect =
      zi > point.z !== zj > point.z &&
      point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Checks if a point is inside an AABB in the XZ plane.
 *
 * @param point - The query point.
 * @param center - The center of the AABB.
 * @param halfWidth - Half of the AABB's width.
 * @param halfDepth - Half of the AABB's depth.
 * @returns True if inside.
 */
export function isPointInAABB(
  point: Point2D,
  center: Point2D,
  halfWidth: number,
  halfDepth: number,
): boolean {
  const minX = center.x - halfWidth;
  const maxX = center.x + halfWidth;
  const minZ = center.z - halfDepth;
  const maxZ = center.z + halfDepth;

  return (
    point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ
  );
}

/**
 * Checks if a point is inside a circle in the XZ plane.
 *
 * @param point - The query point.
 * @param center - The center of the circle.
 * @param radius - The radius of the circle.
 * @returns True if inside.
 */
export function isPointInCircle(
  point: Point2D,
  center: Point2D,
  radius: number,
): boolean {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  return dx * dx + dz * dz <= radius * radius;
}

/**
 * Calculates the squared distance between two points in the XZ plane.
 *
 * @param a - The first point.
 * @param b - The second point.
 * @returns The squared distance.
 */
export function distanceSquaredXZ(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/**
 * Checks if a line segment intersects an AABB in the XZ plane.
 *
 * @param start - The start point of the segment.
 * @param end - The end point of the segment.
 * @param center - The center of the AABB.
 * @param halfWidth - Half of the AABB's width.
 * @param halfDepth - Half of the AABB's depth.
 * @returns True if they intersect.
 */
export function segmentIntersectsAABB(
  start: Point2D,
  end: Point2D,
  center: Point2D,
  halfWidth: number,
  halfDepth: number,
): boolean {
  const dirX = end.x - start.x;
  const dirZ = end.z - start.z;

  let tMin = 0;
  let tMax = 1;

  const minX = center.x - halfWidth;
  const maxX = center.x + halfWidth;
  const minZ = center.z - halfDepth;
  const maxZ = center.z + halfDepth;

  const EPSILON = 1e-3;

  if (Math.abs(dirX) < EPSILON) {
    if (start.x < minX || start.x > maxX) {
      return false;
    }
  } else {
    const invDirX = 1 / dirX;
    let tx1 = (minX - start.x) * invDirX;
    let tx2 = (maxX - start.x) * invDirX;
    if (tx1 > tx2) {
      [tx1, tx2] = [tx2, tx1];
    }
    tMin = Math.max(tMin, tx1);
    tMax = Math.min(tMax, tx2);
    if (tMin > tMax) {
      return false;
    }
  }

  if (Math.abs(dirZ) < EPSILON) {
    if (start.z < minZ || start.z > maxZ) {
      return false;
    }
  } else {
    const invDirZ = 1 / dirZ;
    let tz1 = (minZ - start.z) * invDirZ;
    let tz2 = (maxZ - start.z) * invDirZ;
    if (tz1 > tz2) {
      [tz1, tz2] = [tz2, tz1];
    }
    tMin = Math.max(tMin, tz1);
    tMax = Math.min(tMax, tz2);
    if (tMin > tMax) {
      return false;
    }
  }

  return tMax > EPSILON && tMin < 1 - EPSILON;
}

/**
 * Checks if a line segment intersects a circle in the XZ plane.
 *
 * @param start - The start point of the segment.
 * @param end - The end point of the segment.
 * @param center - The center of the circle.
 * @param radius - The radius of the circle.
 * @returns True if they intersect.
 */
export function segmentIntersectsCircle(
  start: Point2D,
  end: Point2D,
  center: Point2D,
  radius: number,
): boolean {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const fx = start.x - center.x;
  const fz = start.z - center.z;

  const a = dx * dx + dz * dz;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - radius * radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return false;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  const EPSILON = 1e-3;

  if (t1 >= EPSILON && t1 <= 1 - EPSILON) {
    return true;
  }

  if (t2 >= EPSILON && t2 <= 1 - EPSILON) {
    return true;
  }

  return false;
}

/**
 * Calculates squared distance from a point to a polygon.
 * Returns 0 if point is inside.
 *
 * @param point - The query point.
 * @param vertices - The vertices of the polygon.
 * @returns The squared distance.
 */
export function distanceSquaredPointToPolygon(
  point: Point2D,
  vertices: readonly Point2D[],
): number {
  if (!vertices || vertices.length === 0) return Infinity;

  // Check if inside first
  if (isPointInPolygon(point, vertices)) {
    return 0;
  }

  let minDistSq = Infinity;

  // Check distance to edges
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const distSq = distanceSquaredPointToSegment(
      point,
      vertices[i],
      vertices[j],
    );
    if (distSq < minDistSq) minDistSq = distSq;
  }

  return minDistSq;
}
