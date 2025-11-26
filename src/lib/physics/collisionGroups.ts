/**
 * Collision group bitmasks for Rapier physics collision filtering.
 * Each group occupies a single bit position, allowing multiple groups
 * to be combined using bitwise OR operations.
 */
export const CollisionGroup = {
  /** Walls - bit 0 */
  WALL: 0x0001,
  /** Pillars - bit 1 */
  PILLAR: 0x0002,
  /** Robots - bit 2 */
  ROBOT: 0x0004,
  /** Projectiles - bit 3 */
  PROJECTILE: 0x0008,
  /** Combined static geometry (walls + pillars) */
  STATIC_GEOMETRY: 0x0001 | 0x0002,
} as const;

export type CollisionGroupValue =
  (typeof CollisionGroup)[keyof typeof CollisionGroup];

/**
 * Creates a packed 32-bit interaction groups value for Rapier collision filtering.
 * @param membership - Bitmask of groups this body belongs to (upper 16 bits)
 * @param filter - Bitmask of groups this body can interact with (lower 16 bits)
 * @returns Packed 32-bit value: (membership << 16) | filter
 */
export function interactionGroups(membership: number, filter: number): number {
  return (membership << 16) | filter;
}
