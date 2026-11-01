import {
  Point2D,
  segmentIntersectsAABB,
  segmentIntersectsCircle,
} from "../../lib/math/geometry";
import { Vec3, vec3 } from "../../lib/math/vec3";
import {
  blocksStaticSegment,
  buildStaticOcclusionIndex,
} from "./staticOcclusionIndex";

/**
 * Definition of a rectangular arena wall.
 */
export interface ArenaWall {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

/**
 * Definition of a cylindrical arena pillar.
 */
export interface ArenaPillar {
  x: number;
  z: number;
  radius: number;
}

/**
 * Definition of the arena's spatial bounds.
 */
export interface ArenaBounds {
  min: Vec3;
  max: Vec3;
}

// Robot capsule collider radius: 0.891 (99% of 0.9m visual radius)
export const ROBOT_RADIUS = 0.891;

export const ARENA_BOUNDS: ArenaBounds = {
  min: vec3(-48, 0, -48),
  max: vec3(48, 0, 48),
};

export const ARENA_WALLS: readonly ArenaWall[] = Object.freeze([
  // Outer perimeter
  { x: 0, z: -50, halfWidth: 50, halfDepth: 1 },
  { x: 0, z: 50, halfWidth: 50, halfDepth: 1 },
  { x: 50, z: 0, halfWidth: 1, halfDepth: 50 },
  { x: -50, z: 0, halfWidth: 1, halfDepth: 50 },
  // Internal corridors
  { x: 0, z: -20, halfWidth: 20, halfDepth: 0.75 },
  { x: 0, z: 20, halfWidth: 20, halfDepth: 0.75 },
  { x: -20, z: 0, halfWidth: 0.75, halfDepth: 15 },
  { x: 20, z: 0, halfWidth: 0.75, halfDepth: 15 },
  // Central obstacle
  { x: 0, z: 0, halfWidth: 3, halfDepth: 3 },
  // Corner structures
  { x: -35, z: -35, halfWidth: 3, halfDepth: 3 },
  { x: 35, z: -35, halfWidth: 3, halfDepth: 3 },
  { x: -35, z: 35, halfWidth: 3, halfDepth: 3 },
  { x: 35, z: 35, halfWidth: 3, halfDepth: 3 },
]);

export const ARENA_PILLARS: readonly ArenaPillar[] = Object.freeze([
  { x: -30, z: -30, radius: 1.2 },
  { x: 30, z: -30, radius: 1.2 },
  { x: -30, z: 30, radius: 1.2 },
  { x: 30, z: 30, radius: 1.2 },
]);

// Built once: the AI runs a line-of-sight test per in-range robot pair every
// tick, so the static walls and pillars are indexed by cell to skip the open
// parts of the arena instead of testing all 17 shapes.
buildStaticOcclusionIndex(ARENA_WALLS, ARENA_PILLARS, {
  minX: ARENA_BOUNDS.min.x - 4,
  minZ: ARENA_BOUNDS.min.z - 4,
  maxX: ARENA_BOUNDS.max.x + 4,
  maxZ: ARENA_BOUNDS.max.z + 4,
});

/**
 * Checks if the line of sight between two points is blocked by any static geometry (walls or pillars).
 * Performed in 2D (XZ plane).
 *
 * @param start - The starting point.
 * @param end - The ending point.
 * @returns True if line of sight is blocked.
 */
export function isLineOfSightBlocked(start: Point2D, end: Point2D): boolean {
  return blocksStaticSegment(start, end);
}

export interface RuntimeObstacleShapeBox {
  kind: "box";
  halfWidth: number;
  halfDepth: number;
  center?: { x: number; z: number };
}

export interface RuntimeObstacleShapeCircle {
  kind: "circle";
  radius: number;
  center?: { x: number; z: number };
}

export interface RuntimeObstacle {
  blocksVision?: boolean;
  blocksMovement?: boolean;
  active?: boolean;
  shape?: RuntimeObstacleShapeBox | RuntimeObstacleShapeCircle;
  position?: { x: number; y?: number; z: number };
}

export interface RuntimeCheckOptions {
  obstacles?: ReadonlyArray<RuntimeObstacle | null | undefined>;
}

// Reused obstacle-centre point; LOS checks run per robot pair every tick.
const centerScratch = { x: 0, z: 0 };

/**
 * Helper function to check intersections with dynamic obstacles.
 */
function checkIntersectionRuntime(
  start: Vec3,
  end: Vec3,
  options: RuntimeCheckOptions | undefined,
  checkType: "vision" | "movement",
): boolean {
  if (options && Array.isArray(options.obstacles)) {
    const obstacles = options.obstacles as ReadonlyArray<
      RuntimeObstacle | null | undefined
    >;
    for (let i = 0; i < obstacles.length; i += 1) {
      const obs = obstacles[i];
      if (!obs) continue;

      // Check if the obstacle blocks the specific type (vision or movement)
      if (checkType === "vision" && obs.blocksVision === false) continue;
      if (checkType === "movement" && obs.blocksMovement === false) continue;

      if (obs.active === false) continue;

      const shape = obs.shape;
      if (!shape) continue;

      if (shape.kind === "box") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        centerScratch.x = cx;
        centerScratch.z = cz;
        if (
          segmentIntersectsAABB(
            start,
            end,
            centerScratch,
            shape.halfWidth,
            shape.halfDepth,
          )
        )
          return true;
      } else if (shape.kind === "circle") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        centerScratch.x = cx;
        centerScratch.z = cz;
        if (segmentIntersectsCircle(start, end, centerScratch, shape.radius))
          return true;
      }
    }
  }

  return false;
}

/**
 * Runtime-aware line-of-sight check that includes dynamic obstacles.
 * If obstacles are not provided, this behaves like the static check.
 */
export function isLineOfSightBlockedRuntime(
  start: Vec3,
  end: Vec3,
  options?: RuntimeCheckOptions,
): boolean {
  // First check static geometry
  if (isLineOfSightBlocked(start, end)) return true;

  return checkIntersectionRuntime(start, end, options, "vision");
}

/**
 * Checks if the line between two points is blocked by dynamic obstacles that block movement.
 * This is a movement-aware complement to the vision-based LOS checks above.
 */
export function isPathBlockedByMovementRuntime(
  start: Vec3,
  end: Vec3,
  options?: RuntimeCheckOptions,
): boolean {
  return checkIntersectionRuntime(start, end, options, "movement");
}
