import { Ray } from "@dimforge/rapier3d-compat";

import {
  segmentIntersectsAABB,
  segmentIntersectsCircle,
} from "../../lib/math/geometry";
import { distanceVec3, Vec3, vec3 } from "../../lib/math/vec3";

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

const EPSILON = 1e-3;

/**
 * Checks if the line of sight between two points is blocked by any static geometry (walls or pillars).
 * Performed in 2D (XZ plane).
 *
 * @param start - The starting point.
 * @param end - The ending point.
 * @returns True if line of sight is blocked.
 */
export function isLineOfSightBlocked(start: Vec3, end: Vec3): boolean {
  if (start.x === end.x && start.z === end.z) {
    return false;
  }

  for (const wall of ARENA_WALLS) {
    if (
      segmentIntersectsAABB(start, end, wall, wall.halfWidth, wall.halfDepth)
    ) {
      return true;
    }
  }

  for (const pillar of ARENA_PILLARS) {
    if (segmentIntersectsCircle(start, end, pillar, pillar.radius)) {
      return true;
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
  options?: {
    obstacles?: Array<{
      blocksVision?: boolean;
      active?: boolean;
      shape?:
        | {
            kind: "box";
            halfWidth: number;
            halfDepth: number;
            center?: { x: number; z: number };
          }
        | { kind: "circle"; radius: number; center?: { x: number; z: number } };
      position?: { x: number; y?: number; z: number };
    }>;
    rapierWorld?: {
      castRayAndGetNormal?: (
        ray: Ray,
        maxToi: number,
        solid: boolean,
      ) => {
        timeOfImpact: number;
        normal: { x: number; y: number; z: number };
      } | null;
    };
  },
): boolean {
  // First check static geometry
  if (isLineOfSightBlocked(start, end)) return true;

  // If a rapier world is provided prefer raycast checks against the physics world
  const rapierWorld = options?.rapierWorld;
  if (rapierWorld && typeof rapierWorld.castRayAndGetNormal === "function") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const maxDist = distanceVec3(start, end);
    if (maxDist > EPSILON) {
      const dir = { x: dx / maxDist, y: dy / maxDist, z: dz / maxDist };
      const ray = new Ray(start, dir);
      const hit = rapierWorld.castRayAndGetNormal(ray, maxDist, true);
      if (hit) return true;
    }
  }

  if (options && Array.isArray(options.obstacles)) {
    for (const obs of options.obstacles) {
      if (!obs || obs.blocksVision === false) continue;
      if (obs.active === false) continue;

      const shape = obs.shape;
      if (!shape) continue;

      if (shape.kind === "box") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        if (
          segmentIntersectsAABB(
            start,
            end,
            { x: cx, z: cz },
            shape.halfWidth,
            shape.halfDepth,
          )
        )
          return true;
      } else if (shape.kind === "circle") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        if (segmentIntersectsCircle(start, end, { x: cx, z: cz }, shape.radius))
          return true;
      }
    }
  }

  return false;
}

/**
 * Checks if the line between two points is blocked by dynamic obstacles that block movement.
 * This is a movement-aware complement to the vision-based LOS checks above.
 */
export function isPathBlockedByMovementRuntime(
  start: Vec3,
  end: Vec3,
  options?: {
    obstacles?: Array<{
      blocksMovement?: boolean;
      active?: boolean;
      shape?:
        | {
            kind: "box";
            halfWidth: number;
            halfDepth: number;
            center?: { x: number; z: number };
          }
        | { kind: "circle"; radius: number; center?: { x: number; z: number } };
      position?: { x: number; y?: number; z: number };
    }>;
    rapierWorld?: {
      castRayAndGetNormal?: (
        ray: Ray,
        maxToi: number,
        solid: boolean,
      ) => {
        timeOfImpact: number;
        normal: { x: number; y: number; z: number };
      } | null;
    };
  },
): boolean {
  const rapierWorld = options?.rapierWorld;
  if (rapierWorld && typeof rapierWorld.castRayAndGetNormal === "function") {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    const maxDist = distanceVec3(start, end);
    if (maxDist > EPSILON) {
      const dir = { x: dx / maxDist, y: dy / maxDist, z: dz / maxDist };
      const ray = new Ray(start, dir);
      const hit = rapierWorld.castRayAndGetNormal(ray, maxDist, true);
      if (hit) return true;
    }
  }

  if (options && Array.isArray(options.obstacles)) {
    for (const obs of options.obstacles) {
      if (!obs || obs.blocksMovement === false) continue;
      if (obs.active === false) continue;

      const shape = obs.shape;
      if (!shape) continue;

      if (shape.kind === "box") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        if (
          segmentIntersectsAABB(
            start,
            end,
            { x: cx, z: cz },
            shape.halfWidth,
            shape.halfDepth,
          )
        )
          return true;
      } else if (shape.kind === "circle") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        if (segmentIntersectsCircle(start, end, { x: cx, z: cz }, shape.radius))
          return true;
      }
    }
  }

  return false;
}
