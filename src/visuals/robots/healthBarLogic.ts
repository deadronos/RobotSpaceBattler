import { Color } from "three";

import {
  HEALTH_BAR_FULL_COLOR,
  HEALTH_BAR_LOW_COLOR,
  HEALTH_BAR_MID_COLOR,
} from "./robotLayout";

/**
 * Pure HP → health-bar mapping (#168).
 *
 * The bar layer is a projection of ECS health: it reads `health`/`maxHealth`
 * and never writes anything back, so these functions stay trivially testable.
 */

const FULL = new Color(HEALTH_BAR_FULL_COLOR);
const MID = new Color(HEALTH_BAR_MID_COLOR);
const LOW = new Color(HEALTH_BAR_LOW_COLOR);

/** Clamped HP fraction in [0, 1]. A zero or missing max health reads as empty. */
export function healthFraction(health: number, maxHealth: number): number {
  if (!Number.isFinite(health) || !Number.isFinite(maxHealth)) {
    return 0;
  }
  if (maxHealth <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, health / maxHealth));
}

/**
 * Bar fill width multiplier: the fill instance is scaled horizontally by this.
 * Kept separate so the mapping is testable without a renderer.
 */
export function healthBarScale(fraction: number): number {
  return Math.min(1, Math.max(0, fraction));
}

/** Green at full health, amber at half, red when nearly dead. */
export function healthBarColor(
  fraction: number,
  out: Color = new Color(),
): Color {
  const clamped = Math.min(1, Math.max(0, fraction));
  if (clamped >= 0.5) {
    return out.copy(MID).lerp(FULL, (clamped - 0.5) * 2);
  }
  return out.copy(LOW).lerp(MID, clamped * 2);
}

/** A robot needs a bar while it is alive; dead robots are removed by the sim. */
export function isHealthBarVisible(robot: {
  health: number;
  maxHealth: number;
}): boolean {
  return robot.health > 0 && robot.maxHealth > 0;
}

/**
 * Writes the living robots into `out` and returns how many were written.
 *
 * Allocation-free (unlike `filter`), so the bar layer can call it per frame.
 */
export function collectHealthBarRobots<
  T extends { health: number; maxHealth: number },
>(robots: readonly T[], out: (T | undefined)[]): number {
  let count = 0;
  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (!isHealthBarVisible(robot) || count >= out.length) {
      continue;
    }
    out[count] = robot;
    count += 1;
  }
  return count;
}
