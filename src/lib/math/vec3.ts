/**
 * Interface representing a 3D vector.
 */
export interface Vec3 {
  /** The x component of the vector. */
  x: number;
  /** The y component of the vector. */
  y: number;
  /** The z component of the vector. */
  z: number;
}

/**
 * Creates a new Vec3 instance.
 * @param x - The x component (default 0).
 * @param y - The y component (default 0).
 * @param z - The z component (default 0).
 * @returns A new Vec3 object.
 */
export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

/**
 * Creates a clone of the given vector.
 * @param vector - The vector to clone.
 * @returns A new Vec3 object with the same components.
 */
export function cloneVec3(vector: Vec3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

/**
 * Copies components from source to target vector.
 * @param target - The vector to modify.
 * @param source - The vector to copy from.
 * @returns The modified target vector.
 */
export function copyVec3(target: Vec3, source: Vec3): Vec3 {
  target.x = source.x;
  target.y = source.y;
  target.z = source.z;
  return target;
}

/**
 * Adds two vectors and returns the result as a new vector.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns A new vector representing a + b.
 */
export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/**
 * Subtracts vector b from vector a and returns the result as a new vector.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns A new vector representing a - b.
 */
export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/**
 * Scales a vector by a scalar value and returns the result as a new vector.
 * @param vector - The vector to scale.
 * @param scalar - The scaling factor.
 * @returns A new scaled vector.
 */
export function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

/**
 * Scales a vector by a scalar value and stores the result in a target vector.
 * @param target - The vector to store the result in.
 * @param vector - The vector to scale.
 * @param scalar - The scaling factor.
 * @returns The modified target vector.
 */
export function scaleVec3To(target: Vec3, vector: Vec3, scalar: number): Vec3 {
  target.x = vector.x * scalar;
  target.y = vector.y * scalar;
  target.z = vector.z * scalar;
  return target;
}

/**
 * Calculates the length (magnitude) of a vector.
 * @param vector - The vector to measure.
 * @returns The length of the vector.
 */
export function lengthVec3(vector: Vec3): number {
  return Math.sqrt(lengthSquaredVec3(vector));
}

/**
 * Calculates the squared length of a vector.
 * Faster than lengthVec3 as it avoids the square root operation.
 * @param vector - The vector to measure.
 * @returns The squared length of the vector.
 */
export function lengthSquaredVec3(vector: Vec3): number {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

/**
 * Normalizes a vector (scales it to length 1).
 * @param vector - The vector to normalize.
 * @returns A new normalized vector, or a zero vector if the input length is 0.
 */
export function normalizeVec3(vector: Vec3): Vec3 {
  const length = lengthVec3(vector);
  if (length === 0) {
    return vec3(0, 0, 0);
  }

  return scaleVec3(vector, 1 / length);
}

/**
 * Calculates the squared distance between two vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The squared distance between a and b.
 */
export function distanceSquaredVec3(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Calculates the distance between two vectors.
 * @param a - The first vector.
 * @param b - The second vector.
 * @returns The distance between a and b.
 */
export function distanceVec3(a: Vec3, b: Vec3): number {
  return Math.sqrt(distanceSquaredVec3(a, b));
}

/**
 * Linearly interpolates between two vectors.
 * @param a - The start vector.
 * @param b - The end vector.
 * @param t - The interpolation factor (usually between 0 and 1).
 * @returns A new interpolated vector.
 */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return addVec3(a, scaleVec3(subtractVec3(b, a), t));
}

/**
 * Projects a vector onto the XZ plane (sets y to 0).
 * @param vector - The vector to project.
 * @returns A new vector with y = 0.
 */
export function projectOntoPlane(vector: Vec3): Vec3 {
  return { x: vector.x, y: 0, z: vector.z };
}

/**
 * Calculates a perpendicular vector (in the XZ plane).
 * Rotates the projected vector 90 degrees around the Y axis.
 * @param vector - The input vector.
 * @returns A new perpendicular vector.
 */
export function perpendicularVec3(vector: Vec3): Vec3 {
  return { x: -vector.z, y: 0, z: vector.x };
}

/**
 * Adds a delta vector to a target vector in place.
 * @param target - The vector to modify.
 * @param delta - The vector to add.
 * @returns The modified target vector.
 */
export function addInPlaceVec3(target: Vec3, delta: Vec3): Vec3 {
  target.x += delta.x;
  target.y += delta.y;
  target.z += delta.z;
  return target;
}

/**
 * Scales a vector in place.
 * @param target - The vector to modify.
 * @param scalar - The scaling factor.
 * @returns The modified target vector.
 */
export function scaleInPlaceVec3(target: Vec3, scalar: number): Vec3 {
  target.x *= scalar;
  target.y *= scalar;
  target.z *= scalar;
  return target;
}

/**
 * Clamps a vector's components between min and max vectors in place.
 * @param target - The vector to clamp.
 * @param min - The vector containing minimum values for each component.
 * @param max - The vector containing maximum values for each component.
 * @returns The modified target vector.
 */
export function clampVec3(target: Vec3, min: Vec3, max: Vec3): Vec3 {
  target.x = Math.min(Math.max(target.x, min.x), max.x);
  target.y = Math.min(Math.max(target.y, min.y), max.y);
  target.z = Math.min(Math.max(target.z, min.z), max.z);
  return target;
}
