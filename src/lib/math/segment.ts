import type { ReadonlyVec3 } from "./vec3";

/** 2D point in the XZ plane (Vec3-compatible). */
export interface PlanarPoint {
  readonly x: number;
  readonly z: number;
}

/** Directions shorter than this are treated as zero (degenerate segment). */
const MIN_DIRECTION_SQ = 1e-12;

/** Clamp helper so the hit parameter always lands on the segment. */
function isValidT(t: number): boolean {
  return t >= 0 && t <= 1;
}

/**
 * Returns the earliest `t` in [0, 1] where the segment a->b enters the sphere
 * (center, radius), or `null` when it does not hit. A segment that starts
 * inside the sphere reports `t = 0`. Used for swept (continuous) collision so
 * fast movers cannot tunnel.
 */
export function segmentSphereHitT(
  a: ReadonlyVec3,
  b: ReadonlyVec3,
  center: ReadonlyVec3,
  radius: number,
): number | null {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const acx = center.x - a.x;
  const acy = center.y - a.y;
  const acz = center.z - a.z;

  const radiusSq = radius * radius;
  const startSq = acx * acx + acy * acy + acz * acz;
  if (startSq <= radiusSq) {
    return 0;
  }

  const lengthSq = abx * abx + aby * aby + abz * abz;
  if (lengthSq <= MIN_DIRECTION_SQ) {
    return null;
  }

  const halfB = acx * abx + acy * aby + acz * abz;
  const c = startSq - radiusSq;
  const discriminant = halfB * halfB - lengthSq * c;
  if (discriminant < 0) {
    return null;
  }

  const t = (halfB - Math.sqrt(discriminant)) / lengthSq;
  return isValidT(t) ? t : null;
}

/**
 * Tests whether the segment a->b intersects the sphere (center, radius).
 * Used for swept (continuous) collision so fast movers cannot tunnel.
 */
export function segmentIntersectsSphere(
  a: ReadonlyVec3,
  b: ReadonlyVec3,
  center: ReadonlyVec3,
  radius: number,
): boolean {
  return segmentSphereHitT(a, b, center, radius) !== null;
}

/**
 * Returns the earliest `t` in [0, 1] where the segment a->b enters the
 * axis-aligned box (XZ plane only, matching the planar gameplay geometry), or
 * `null` when it does not hit. A segment that starts inside the box reports
 * `t = 0`.
 */
export function segmentAABBHitT(
  a: PlanarPoint,
  b: PlanarPoint,
  center: PlanarPoint,
  halfWidth: number,
  halfDepth: number,
): number | null {
  const dirX = b.x - a.x;
  const dirZ = b.z - a.z;

  let tMin = 0;
  let tMax = 1;

  const minX = center.x - halfWidth;
  const maxX = center.x + halfWidth;

  if (dirX * dirX <= MIN_DIRECTION_SQ) {
    if (a.x < minX || a.x > maxX) {
      return null;
    }
  } else {
    const invDirX = 1 / dirX;
    let tx1 = (minX - a.x) * invDirX;
    let tx2 = (maxX - a.x) * invDirX;
    if (tx1 > tx2) {
      const swap = tx1;
      tx1 = tx2;
      tx2 = swap;
    }
    tMin = tx1 > tMin ? tx1 : tMin;
    tMax = tx2 < tMax ? tx2 : tMax;
    if (tMin > tMax) {
      return null;
    }
  }

  const minZ = center.z - halfDepth;
  const maxZ = center.z + halfDepth;

  if (dirZ * dirZ <= MIN_DIRECTION_SQ) {
    if (a.z < minZ || a.z > maxZ) {
      return null;
    }
  } else {
    const invDirZ = 1 / dirZ;
    let tz1 = (minZ - a.z) * invDirZ;
    let tz2 = (maxZ - a.z) * invDirZ;
    if (tz1 > tz2) {
      const swap = tz1;
      tz1 = tz2;
      tz2 = swap;
    }
    tMin = tz1 > tMin ? tz1 : tMin;
    tMax = tz2 < tMax ? tz2 : tMax;
    if (tMin > tMax) {
      return null;
    }
  }

  return tMin;
}

/**
 * Returns the earliest `t` in [0, 1] where the segment a->b enters the
 * circle/disk (XZ plane), or `null` when it does not hit. A segment that
 * starts inside the circle reports `t = 0`.
 */
export function segmentCircleHitT(
  a: PlanarPoint,
  b: PlanarPoint,
  center: PlanarPoint,
  radius: number,
): number | null {
  const fx = center.x - a.x;
  const fz = center.z - a.z;
  const startSq = fx * fx + fz * fz;
  const radiusSq = radius * radius;
  if (startSq <= radiusSq) {
    return 0;
  }

  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  if (lengthSq <= MIN_DIRECTION_SQ) {
    return null;
  }

  const halfB = fx * dx + fz * dz;
  const c = startSq - radiusSq;
  const discriminant = halfB * halfB - lengthSq * c;
  if (discriminant < 0) {
    return null;
  }

  const t = (halfB - Math.sqrt(discriminant)) / lengthSq;
  return isValidT(t) ? t : null;
}
