import type { Vector3 } from '../types';

export function lerpVector(from: Vector3, to: Vector3, alpha: number): Vector3 {
  const clampedAlpha = Math.min(1, Math.max(0, alpha));

  return {
    x: from.x + (to.x - from.x) * clampedAlpha,
    y: from.y + (to.y - from.y) * clampedAlpha,
    z: from.z + (to.z - from.z) * clampedAlpha,
  };
}
