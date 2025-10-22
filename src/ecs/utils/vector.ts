import { Vec3 } from "../world";

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(vec: Vec3, factor: number): Vec3 {
  return { x: vec.x * factor, y: vec.y * factor, z: vec.z * factor };
}

export function lengthSq(vec: Vec3): number {
  return vec.x * vec.x + vec.y * vec.y + vec.z * vec.z;
}

export function normalize(vec: Vec3): Vec3 {
  const len = Math.sqrt(lengthSq(vec)) || 1;
  return scaleVec3(vec, 1 / len);
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.sqrt(lengthSq(subVec3(a, b)));
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}
