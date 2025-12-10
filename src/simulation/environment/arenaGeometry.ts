import { Ray } from "@dimforge/rapier3d-compat";

import { Vec3, vec3 } from "../../lib/math/vec3";

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

export const ROBOT_RADIUS = 1.0;

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

function segmentIntersectsAabb2D(
  start: Vec3,
  end: Vec3,
  wall: ArenaWall,
): boolean {
  const dirX = end.x - start.x;
  const dirZ = end.z - start.z;

  let tMin = 0;
  let tMax = 1;

  const minX = wall.x - wall.halfWidth;
  const maxX = wall.x + wall.halfWidth;
  const minZ = wall.z - wall.halfDepth;
  const maxZ = wall.z + wall.halfDepth;

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

function segmentIntersectsCircle2D(
  start: Vec3,
  end: Vec3,
  pillar: ArenaPillar,
): boolean {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const fx = start.x - pillar.x;
  const fz = start.z - pillar.z;

  const a = dx * dx + dz * dz;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - pillar.radius * pillar.radius;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return false;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  if (t1 >= EPSILON && t1 <= 1 - EPSILON) {
    return true;
  }

  if (t2 >= EPSILON && t2 <= 1 - EPSILON) {
    return true;
  }

  return false;
}

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
    if (segmentIntersectsAabb2D(start, end, wall)) {
      return true;
    }
  }

  for (const pillar of ARENA_PILLARS) {
    if (segmentIntersectsCircle2D(start, end, pillar)) {
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
    const maxDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
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
        const wall = {
          x: cx,
          z: cz,
          halfWidth: shape.halfWidth,
          halfDepth: shape.halfDepth,
        };
        if (segmentIntersectsAabb2D(start, end, wall)) return true;
      } else if (shape.kind === "circle") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        const pillar = { x: cx, z: cz, radius: shape.radius };
        if (segmentIntersectsCircle2D(start, end, pillar)) return true;
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
    const maxDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
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
        const wall = {
          x: cx,
          z: cz,
          halfWidth: shape.halfWidth,
          halfDepth: shape.halfDepth,
        };
        if (segmentIntersectsAabb2D(start, end, wall)) return true;
      } else if (shape.kind === "circle") {
        const cx = shape.center?.x ?? obs.position?.x ?? 0;
        const cz = shape.center?.z ?? obs.position?.z ?? 0;
        const pillar = { x: cx, z: cz, radius: shape.radius };
        if (segmentIntersectsCircle2D(start, end, pillar)) return true;
      }
    }
  }

  return false;
}
