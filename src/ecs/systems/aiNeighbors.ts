import { distanceSquaredVec3, Vec3 } from "../../lib/math/vec3";
import { SpatialGrid } from "../../simulation/ai/spatialGrid";
import { RobotEntity } from "../world";

/** Allies closer than this (3D distance) count as flocking neighbours. */
export const NEIGHBOR_RADIUS = 2.5;
const NEIGHBOR_RADIUS_SQ = NEIGHBOR_RADIUS * NEIGHBOR_RADIUS;

/**
 * Identifies nearby allied robots to assist with flocking/formation behavior.
 * Uses the per-tick spatial grid instead of scanning every robot.
 *
 * The ally list from the grid is already in world order and only contains
 * active robots, so this walks it directly: a grid query for a 2.5 unit radius
 * costs more (and resizes its output buffer) than a few distance checks.
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
  const allies = grid.teamMembers(robot.team);
  const position = robot.position;
  let count = 0;

  for (let i = 0; i < allies.length; i += 1) {
    const ally = allies[i];
    if (ally.id === robot.id) continue;
    // Exact 3D range test, as before; the XZ test is implied by it.
    if (distanceSquaredVec3(ally.position, position) < NEIGHBOR_RADIUS_SQ) {
      out[count] = ally.position;
      count += 1;
    }
  }

  // Trim once at the end; `length = 0` + push would reallocate every call.
  if (out.length !== count) out.length = count;
  return out;
}
