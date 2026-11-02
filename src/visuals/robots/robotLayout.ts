import type { UnitRole } from "../../ecs/worldTypes";

/**
 * Shared geometry/scale constants for the instanced robot visuals (#168).
 *
 * Rendering only projects ECS state: everything here is presentation data, and
 * nothing writes back into the simulation.
 */

/** Height of the robot centre above the arena floor. */
export const ROBOT_CENTER_Y = 0.8;

/** The roles in a stable order; instance slot buffers index into this. */
export const ROBOT_ROLES = [
  "assault",
  "tank",
  "sniper",
  "medic",
] as const satisfies readonly UnitRole[];

/**
 * Instanced capacity per role.
 *
 * The default roster is five robots per role across both teams (ten per team),
 * so 16 keeps headroom for debug spawns without growing the draw-call count:
 * instances that are not in use are hidden, never un-drawn.
 */
export const MAX_ROBOTS_PER_ROLE = 16;

/** Total robot instances the visuals can show at once. */
export const MAX_ROBOTS = ROBOT_ROLES.length * MAX_ROBOTS_PER_ROLE;

/**
 * Radius of the additive hit-flash halo per role, so the glow hugs each
 * silhouette instead of drawing one-size-fits-all orb.
 */
export const ROBOT_HIT_FLASH_RADIUS: Record<UnitRole, number> = {
  assault: 1.05,
  tank: 1.35,
  sniper: 0.75,
  medic: 1.15,
};

/** Health bar size in world units (1 unit = 1 metre). */
export const HEALTH_BAR_WIDTH = 1.35;
export const HEALTH_BAR_HEIGHT = 0.16;
export const HEALTH_BAR_Y = ROBOT_CENTER_Y + 2.25;

/**
 * Where each role's weapon muzzle sits, relative to the body centre.
 *
 * Presentation data only: the muzzle flash visual reads it, and the sim's
 * projectile spawn point is independent of it.
 */
export const ROBOT_MUZZLE_OFFSETS: Record<
  UnitRole,
  { y: number; forward: number }
> = {
  assault: { y: 0.32, forward: 1.05 },
  tank: { y: 0.12, forward: 1.3 },
  sniper: { y: 0.5, forward: 0.8 },
  medic: { y: 0.25, forward: 1.0 },
};

/** Health bar fill colours: full, middle and empty. */
export const HEALTH_BAR_FULL_COLOR = "#3ee36b";
export const HEALTH_BAR_MID_COLOR = "#ffd166";
export const HEALTH_BAR_LOW_COLOR = "#ff4d5a";
/** Nearly black, so the bar reads against both team colours. */
export const HEALTH_BAR_BACK_COLOR = "#232b45";
