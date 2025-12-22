import { Vec3, vec3 } from "./vec3";

/** 2D point in the XZ plane (Vec3-compatible). */
export interface Point2D {
  x: number;
  z: number;
}

/** Closest point on an AABB (XZ plane; preserves Y). */
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

/** Squared distance from point to AABB (XZ plane). */
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

/** Closest point on a circle/disk (XZ plane; preserves Y). */
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

/** Squared distance from a point to a disk (XZ plane). Returns 0 if inside. */
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

/** Squared distance from point to segment (XZ plane). */
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

/** Point-in-polygon test (XZ plane) using ray casting. */
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

/** Point-in-AABB check (XZ plane). */
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

/** Point-in-circle check (XZ plane). */
export function isPointInCircle(
  point: Point2D,
  center: Point2D,
  radius: number,
): boolean {
  const dx = point.x - center.x;
  const dz = point.z - center.z;
  return dx * dx + dz * dz <= radius * radius;
}

/** Squared distance between two XZ points. */
export function distanceSquaredXZ(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/** Segment-vs-AABB intersection (XZ plane). */
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

/** Segment-vs-circle intersection (XZ plane). */
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

/** Squared distance from point to polygon edges (0 if inside). */
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
