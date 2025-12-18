import { cloneVec3, Vec3, vec3 } from "./vec3";

/**
 * Calculates the lengths of segments in a path.
 *
 * @param points - The sequence of points defining the path.
 * @returns An array of segment lengths.
 */
export function segmentLengths(points: Vec3[]): number[] {
  const lens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    lens.push(Math.sqrt(dx * dx + dz * dz));
  }
  return lens;
}

/**
 * Calculates the total length of a path given segment lengths.
 *
 * @param lens - The lengths of the segments.
 * @returns The total length.
 */
export function totalLength(lens: number[]): number {
  return lens.reduce((s, v) => s + v, 0);
}

/**
 * Finds a point on a path at a specific distance from the start.
 *
 * @param points - The sequence of points defining the path.
 * @param lens - The lengths of the segments.
 * @param distance - The distance from the start.
 * @returns The point on the path at the given distance.
 */
export function pointAtDistance(
  points: Vec3[],
  lens: number[],
  distance: number,
): Vec3 {
  if (points.length === 0) return vec3(0, 0, 0);
  if (points.length === 1) return cloneVec3(points[0]);

  let remaining = distance;
  for (let i = 0; i < lens.length; i++) {
    const seg = lens[i];
    if (remaining <= seg) {
      const a = points[i];
      const b = points[i + 1];
      const t = seg <= 0 ? 0 : remaining / seg;
      return vec3(a.x + (b.x - a.x) * t, 0, a.z + (b.z - a.z) * t);
    }
    remaining -= seg;
  }

  // Fall back to last point
  return cloneVec3(points[points.length - 1]);
}
