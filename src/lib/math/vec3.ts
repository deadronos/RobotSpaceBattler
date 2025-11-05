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
