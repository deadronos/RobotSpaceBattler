/**
 * Pure hit/muzzle flash triggers (#168).
 *
 * Both effects are derived from fields the simulation already maintains, so the
 * visuals add no simulation state:
 *
 * - hits: `lastDamageTimestamp` is set by the damage path (and by hazards).
 * - shots: firing sets `fireCooldown = 1 / fireRate`, which then decays by the
 *   fixed step, so `1 / fireRate - fireCooldown` is the time since the shot.
 */

/** How long a damaged robot keeps its hit flash. */
export const HIT_FLASH_MS = 150;

/** How long a muzzle flash stays at the firing robot. */
export const MUZZLE_FLASH_MS = 90;

/** Spawned robots start with this timestamp; it never marks a real hit. */
const NEVER_DAMAGED = 0;

/**
 * Flash strength in [0, 1]: 1 at the moment of the hit, fading to 0.
 *
 * @param nowMs - Simulation time (`world.state.elapsedMs`).
 * @param lastDamageTimestampMs - `robot.lastDamageTimestamp`.
 * @param durationMs - Flash length.
 */
export function hitFlashIntensity(
  nowMs: number,
  lastDamageTimestampMs: number,
  durationMs: number = HIT_FLASH_MS,
): number {
  if (lastDamageTimestampMs <= NEVER_DAMAGED) {
    return 0;
  }
  const elapsed = nowMs - lastDamageTimestampMs;
  if (elapsed < 0 || elapsed >= durationMs) {
    return 0;
  }
  return 1 - elapsed / durationMs;
}

/**
 * Seconds since this robot last fired, or Infinity when it has no shot cooling
 * down (never fired, or the cooldown already expired).
 */
export function timeSinceFire(fireCooldown: number, fireRate: number): number {
  if (fireCooldown <= 0 || fireRate <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, 1 / fireRate - fireCooldown);
}

/**
 * Flash strength in [0, 1] for a robot that has just fired.
 *
 * @param fireCooldown - `robot.fireCooldown` (seconds left before the next shot).
 * @param fireRate - `robot.fireRate` (shots per second).
 * @param durationMs - Flash length.
 */
export function muzzleFlashIntensity(
  fireCooldown: number,
  fireRate: number,
  durationMs: number = MUZZLE_FLASH_MS,
): number {
  const sinceFire = timeSinceFire(fireCooldown, fireRate);
  if (!Number.isFinite(sinceFire) || sinceFire >= durationMs / 1000) {
    return 0;
  }
  return 1 - (sinceFire * 1000) / durationMs;
}
