import type { ArenaEntity } from '../entities/Arena';
import type { Vector3 } from '../../types';

export function cloneVector(vector: Vector3): Vector3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function addVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVectors(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVector(vector: Vector3, scalar: number): Vector3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function distance(a: Vector3, b: Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

export function normalize(vector: Vector3): Vector3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function clampToArena(arena: ArenaEntity, position: Vector3): Vector3 {
  return {
    x: Math.min(arena.boundaries.max.x, Math.max(arena.boundaries.min.x, position.x)),
    y: Math.max(0, position.y),
    z: Math.min(arena.boundaries.max.z, Math.max(arena.boundaries.min.z, position.z)),
  };
}
