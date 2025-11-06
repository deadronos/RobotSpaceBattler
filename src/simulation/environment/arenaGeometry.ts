import { Vec3, vec3 } from '../../lib/math/vec3';

export interface ArenaWall {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

export interface ArenaPillar {
  x: number;
  z: number;
  radius: number;
}

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

function segmentIntersectsAabb2D(start: Vec3, end: Vec3, wall: ArenaWall): boolean {
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

function segmentIntersectsCircle2D(start: Vec3, end: Vec3, pillar: ArenaPillar): boolean {
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
