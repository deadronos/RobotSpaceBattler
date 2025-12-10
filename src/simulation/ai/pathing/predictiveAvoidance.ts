/**
 * Predictive Avoidance Module - Computes avoidance vectors using forward-looking raycasts.
 * Uses a 3-ray fan pattern to detect obstacles ahead and compute steering away from them.
 * @module predictiveAvoidance
 */

import { CollisionGroup } from "../../../lib/physics/collisionGroups";
import { PhysicsQueryService, Vec3Like } from "./physicsQueryService";

/** Configuration for predictive avoidance behavior */
export interface PredictiveAvoidanceConfig {
  /** How far ahead to look for obstacles (default: 5.0 units) */
  lookaheadDistance: number;
  /** Angle between center and side rays in radians (default: π/6 = 30°) */
  fanAngle: number;
  /** Multiplier for avoidance force (default: 2.0) */
  avoidanceStrength: number;
}

/** Default configuration values */
export const DEFAULT_AVOIDANCE_CONFIG: Readonly<PredictiveAvoidanceConfig> = {
  lookaheadDistance: 5.0,
  fanAngle: Math.PI / 6, // 30 degrees
  avoidanceStrength: 2.0,
};

const VELOCITY_THRESHOLD = 0.001;

/** Rotate a direction vector around the Y axis (XZ plane movement) */
function rotateAroundY(dir: Vec3Like, angleRadians: number): Vec3Like {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  return {
    x: dir.x * cos - dir.z * sin,
    y: dir.y,
    z: dir.x * sin + dir.z * cos,
  };
}

/** Compute cross product of two vectors */
function cross(a: Vec3Like, b: Vec3Like): Vec3Like {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Computes an avoidance vector based on forward-looking raycasts.
 * Returns a steering vector pointing away from nearby obstacles.
 *
 * @param position Current entity position
 * @param velocity Current entity velocity (direction of movement)
 * @param queryService Physics query service for raycasting
 * @param config Optional configuration overrides
 * @returns Avoidance vector (zero if no avoidance needed)
 */
export function computePredictiveAvoidance(
  position: Vec3Like,
  velocity: Vec3Like,
  queryService: PhysicsQueryService,
  config?: Partial<PredictiveAvoidanceConfig>,
): Vec3Like {
  const cfg = { ...DEFAULT_AVOIDANCE_CONFIG, ...config };

  // Check if velocity is near zero
  const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
  if (speed < VELOCITY_THRESHOLD) {
    return { x: 0, y: 0, z: 0 };
  }

  // Normalize velocity to get forward direction
  const forward: Vec3Like = {
    x: velocity.x / speed,
    y: velocity.y / speed,
    z: velocity.z / speed,
  };

  // Create 3-ray fan: center, left (+angle), right (-angle)
  const directions: Vec3Like[] = [
    forward,
    rotateAroundY(forward, cfg.fanAngle),
    rotateAroundY(forward, -cfg.fanAngle),
  ];

  // Cast rays
  const hits = queryService.castRayFan(
    position,
    directions,
    cfg.lookaheadDistance,
    CollisionGroup.STATIC_GEOMETRY,
  );

  // Accumulate avoidance vector
  const avoidance: Vec3Like = { x: 0, y: 0, z: 0 };
  const upVector: Vec3Like = { x: 0, y: 1, z: 0 };

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (!hit) continue;

    // Closer hits get stronger avoidance (inverse linear falloff)
    const weight = 1 - hit.distance / cfg.lookaheadDistance;

    // Avoidance direction: perpendicular to ray (cross with up vector)
    const rayDir = directions[i];
    const perpendicular = cross(rayDir, upVector);

    // For left ray (i=1), steer right (negative perpendicular since cross gives left)
    // For right ray (i=2), steer left (positive perpendicular)
    // For center ray (i=0), pick a consistent side (right = negative perpendicular)
    const sign = i === 2 ? 1 : -1;

    avoidance.x += perpendicular.x * weight * cfg.avoidanceStrength * sign;
    avoidance.y += perpendicular.y * weight * cfg.avoidanceStrength * sign;
    avoidance.z += perpendicular.z * weight * cfg.avoidanceStrength * sign;
  }

  return avoidance;
}
