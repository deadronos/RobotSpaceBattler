/**
 * Physics Query Service - Abstraction over Rapier raycasting for AI pathing.
 * Provides graceful null fallback when physics world is unavailable.
 * @module physicsQueryService
 */

import { Ray } from '@dimforge/rapier3d-compat';

/** 3D vector for physics queries */
export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** Result of a successful raycast */
export interface RaycastHit {
  /** World-space hit point */
  point: Vec3Like;
  /** Surface normal at hit point */
  normal: Vec3Like;
  /** Distance from ray origin to hit point */
  distance: number;
}

/** Service interface for physics queries */
export interface PhysicsQueryService {
  /**
   * Cast a single ray into the physics world.
   * @param origin Ray origin point
   * @param direction Ray direction (should be normalized)
   * @param maxDistance Maximum distance to check
   * @param filterMask Optional interaction groups bitmask for collision filtering
   * @returns Hit data or null if no hit / world unavailable
   */
  castRay(
    origin: Vec3Like,
    direction: Vec3Like,
    maxDistance: number,
    filterMask?: number
  ): RaycastHit | null;

  /**
   * Cast multiple rays from the same origin.
   * @param origin Ray origin point
   * @param directions Array of ray directions
   * @param maxDistance Maximum distance for all rays
   * @param filterMask Optional interaction groups bitmask
   * @returns Array of hits (null entries for misses/unavailable)
   */
  castRayFan(
    origin: Vec3Like,
    directions: Vec3Like[],
    maxDistance: number,
    filterMask?: number
  ): Array<RaycastHit | null>;
}

/**
 * Minimal Rapier World interface for raycasting.
 * Only defines methods we use to avoid importing full Rapier types.
 */
interface RapierWorldLike {
  castRayAndGetNormal(
    ray: Ray,
    maxToi: number,
    solid: boolean,
    filterFlags?: number,
    filterGroups?: number
  ): { timeOfImpact: number; normal: Vec3Like } | null;
}

/**
 * Creates a physics query service.
 * Returns null-safe fallback when Rapier world is unavailable.
 * @param rapierWorld Rapier physics world instance or null/undefined
 */
export function createPhysicsQueryService(
  rapierWorld: RapierWorldLike | null | undefined
): PhysicsQueryService {
  // Null-safe fallback implementation
  if (!rapierWorld) {
    return {
      castRay: () => null,
      castRayFan: (_origin, directions) => directions.map(() => null),
    };
  }

  const world = rapierWorld;

  return {
    castRay(
      origin: Vec3Like,
      direction: Vec3Like,
      maxDistance: number,
      filterMask?: number
    ): RaycastHit | null {
      // Create proper Ray instance (fixes Rapier deprecation warning)
      const ray = new Ray(origin, direction);
      const hit = world.castRayAndGetNormal(ray, maxDistance, true, undefined, filterMask);

      if (!hit) {
        return null;
      }

      const distance = hit.timeOfImpact;
      return {
        point: {
          x: origin.x + direction.x * distance,
          y: origin.y + direction.y * distance,
          z: origin.z + direction.z * distance,
        },
        normal: hit.normal,
        distance,
      };
    },

    castRayFan(
      origin: Vec3Like,
      directions: Vec3Like[],
      maxDistance: number,
      filterMask?: number
    ): Array<RaycastHit | null> {
      return directions.map((dir) =>
        this.castRay(origin, dir, maxDistance, filterMask)
      );
    },
  };
}
