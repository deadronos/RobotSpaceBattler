export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function lengthVec3(vector: Vec3): number {
  return Math.sqrt(lengthSquaredVec3(vector));
}

export function lengthSquaredVec3(vector: Vec3): number {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

export function normalizeVec3(vector: Vec3): Vec3 {
  const length = lengthVec3(vector);
  if (length === 0) {
    return vec3(0, 0, 0);
  }

  return scaleVec3(vector, 1 / length);
}

export function distanceSquaredVec3(a: Vec3, b: Vec3): number {
  return lengthSquaredVec3(subtractVec3(a, b));
}

export function distanceVec3(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSquaredVec3(a, b));
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return addVec3(a, scaleVec3(subtractVec3(b, a), t));
}

export function projectOntoPlane(vector: Vec3): Vec3 {
  return { x: vector.x, y: 0, z: vector.z };
}

export function perpendicularVec3(vector: Vec3): Vec3 {
  return { x: -vector.z, y: 0, z: vector.x };
}

export function addInPlaceVec3(target: Vec3, delta: Vec3): Vec3 {
  target.x += delta.x;
  target.y += delta.y;
  target.z += delta.z;
  return target;
}

export function scaleInPlaceVec3(target: Vec3, scalar: number): Vec3 {
  target.x *= scalar;
  target.y *= scalar;
  target.z *= scalar;
  return target;
}

export function clampVec3(target: Vec3, min: Vec3, max: Vec3): Vec3 {
  target.x = Math.min(Math.max(target.x, min.x), max.x);
  target.y = Math.min(Math.max(target.y, min.y), max.y);
  target.z = Math.min(Math.max(target.z, min.z), max.z);
  return target;
}
