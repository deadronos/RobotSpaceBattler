import { distanceVec3, Vec3 } from "../../lib/math/vec3";
import { SpatialGrid } from "../../simulation/ai/spatialGrid";
import { RobotEntity } from "../world";

/** Allies closer than this (3D distance) count as flocking neighbours. */
export const NEIGHBOR_RADIUS = 2.5;

const candidatesScratch: RobotEntity[] = [];

/**
 * Identifies nearby allied robots to assist with flocking/formation behavior.
 * Uses the per-tick spatial grid instead of scanning every ally.
 *
 * The positions written to `out` are the allies' live position vectors (not
 * copies); callers must treat them as read-only and short lived.
 *
 * @param robot - The robot looking for neighbors.
 * @param grid - Spatial index rebuilt for the current tick.
 * @param out - Reused output array, cleared and filled with ally positions in world order.
 * @returns `out`.
 */
export function buildNeighbors(
  robot: RobotEntity,
  grid: SpatialGrid,
  out: Vec3[],
): Vec3[] {
  const nearby = grid.query(
    robot.position.x,
    robot.position.z,
    NEIGHBOR_RADIUS,
    robot.team,
    true,
    robot,
    candidatesScratch,
  );
  let count = 0;
  for (let i = 0; i < nearby.length; i += 1) {
    const ally = nearby[i];
    // The grid is a coarse XZ filter; apply the exact 3D range test.
    if (distanceVec3(ally.position, robot.position) < NEIGHBOR_RADIUS) {
      out[count] = ally.position;
      count += 1;
    }
  }
  // Trim once at the end; `length = 0` + push would reallocate every call.
  if (out.length !== count) out.length = count;
  return out;
}
