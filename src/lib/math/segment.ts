import type { ReadonlyVec3 } from "./vec3";

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
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const acx = center.x - a.x;
  const acy = center.y - a.y;
  const acz = center.z - a.z;

  const lengthSq = abx * abx + aby * aby + abz * abz;
  let t = 0;
  if (lengthSq > 0) {
    t = (acx * abx + acy * aby + acz * abz) / lengthSq;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
  }

  const dx = acx - abx * t;
  const dy = acy - aby * t;
  const dz = acz - abz * t;
  return dx * dx + dy * dy + dz * dz <= radius * radius;
}
