/**
 * Camera Math Utilities — Pure Spherical Coordinate System
 *
 * Provides mathematical functions for camera control using spherical coordinates.
 * All functions are pure (no side effects) and have no React dependencies.
 *
 * Spherical Coordinate System:
 * - azimuth: Rotation around Y-axis (0 = +Z, π/2 = -X, π = -Z, 3π/2 = +X)
 * - polar: Angle from +Y axis down toward XZ plane (0 = top, π/2 = horizontal)
 * - distance: Radial distance from target point
 *
 * Used by: useCameraControls hook for 3D camera positioning and navigation.
 */

import type { ArenaEntity } from "../ecs/entities/Arena";
import type { Vector3 } from "../types";

/**
 * Spherical coordinate representation for camera positioning.
 * Used to parameterize the camera's orbit around a target point.
 */
export interface SphericalCoordinates {
  /** Azimuthal angle (rotation around Y-axis) in radians, range [0, 2π) */
  azimuth: number;
  /** Polar angle (from +Y axis toward XZ plane) in radians */
  polar: number;
  /** Radial distance from target point */
  distance: number;
}

const TWO_PI = Math.PI * 2;

/**
 * Clamps a value to a minimum and maximum range.
 * @param value The value to clamp
 * @param min Minimum bound (inclusive)
 * @param max Maximum bound (inclusive)
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Wraps an angle to the range [0, 2π).
 * Ensures angles are normalized to a standard range for comparison and calculation.
 *
 * @param angle Angle in radians
 * @returns Normalized angle in range [0, 2π)
 */
export const wrapAngle = (angle: number): number => {
  let wrapped = angle % TWO_PI;
  if (wrapped < 0) {
    wrapped += TWO_PI;
  }
  return wrapped;
};

/**
 * Converts spherical coordinates to cartesian world position.
 * Applies arena boundary constraints and enforces minimum height.
 *
 * Mathematical formula:
 * - x = target.x + r * sin(polar) * sin(azimuth)
 * - y = target.y + r * cos(polar)
 * - z = target.z + r * sin(polar) * cos(azimuth)
 *
 * @param target Center point around which camera orbits
 * @param spherical Spherical coordinates (azimuth, polar, distance)
 * @param arena Arena boundaries for clamping
 * @param minDistance Minimum distance threshold (e.g., for collision avoidance)
 * @returns Cartesian position clamped to arena and height constraints
 */
export const toCartesian = (
  target: Vector3,
  spherical: SphericalCoordinates,
  arena: ArenaEntity,
  minDistance: number,
): Vector3 => {
  const sinPolar = Math.sin(spherical.polar);
  const cosPolar = Math.cos(spherical.polar);
  const sinAzimuth = Math.sin(spherical.azimuth);
  const cosAzimuth = Math.cos(spherical.azimuth);

  // Apply minimum distance constraint
  const radius = Math.max(spherical.distance, minDistance);

  // Calculate raw cartesian position
  const position: Vector3 = {
    x: target.x + radius * sinPolar * sinAzimuth,
    y: target.y + radius * cosPolar,
    z: target.z + radius * sinPolar * cosAzimuth,
  };

  // Clamp to arena boundaries
  return {
    x: clamp(position.x, arena.boundaries.min.x, arena.boundaries.max.x),
    // Enforce minimum height above target
    y: Math.max(target.y + 5, position.y),
    z: clamp(position.z, arena.boundaries.min.z, arena.boundaries.max.z),
  };
};

/**
 * Calculates the right vector (positive X direction) for a given azimuthal angle.
 * Used for camera strafe movement (left/right pan).
 *
 * @param azimuth Azimuthal angle in radians
 * @returns Normalized right direction vector (unit vector)
 */
export const buildRightVector = (azimuth: number): Vector3 => ({
  x: Math.sin(azimuth - Math.PI / 2),
  y: 0,
  z: Math.cos(azimuth - Math.PI / 2),
});

/**
 * Calculates the forward vector for a given azimuthal angle.
 * Used for camera forward/backward movement (relative to azimuth).
 *
 * @param azimuth Azimuthal angle in radians
 * @returns Normalized forward direction vector (unit vector)
 */
export const buildForwardVector = (azimuth: number): Vector3 => ({
  x: Math.sin(azimuth),
  y: 0,
  z: Math.cos(azimuth),
});
