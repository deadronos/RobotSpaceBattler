import { BufferGeometry, ConeGeometry, TorusGeometry } from "three";

import type { TeamId } from "../../lib/teamConfig";
import { ensureGeometryHasVertexColors } from "../instanceColorUtils";
import { isHealthBarVisible } from "./healthBarLogic";
import { HEALTH_BAR_Y, MAX_ROBOTS } from "./robotLayout";

/**
 * Per-team shape markers (#166).
 *
 * Colour alone cannot identify a team: around 8% of men have a red/green colour
 * vision deficiency, and the default crimson/azure pair is weak for protanopia.
 * Every living robot therefore also carries a small billboarded badge above its
 * health bar: a pyramid for red, a ring for blue. Two instanced meshes total, so
 * the draw-call count stays constant. Rendering only, no simulation state.
 */

/** Marker height, just above the health bar. */
export const TEAM_MARKER_Y = HEALTH_BAR_Y + 0.42;

/** Instanced capacity per team; the roster is far below this. */
export const MAX_ROBOTS_PER_TEAM = MAX_ROBOTS / 2;

/** A distinct silhouette per team: pointed crest vs open ring. */
export function createTeamMarkerGeometry(team: TeamId): BufferGeometry {
  const geometry =
    team === "red"
      ? new ConeGeometry(0.23, 0.62, 4)
      : new TorusGeometry(0.22, 0.075, 8, 16);
  ensureGeometryHasVertexColors(geometry);
  return geometry;
}

/**
 * Writes living robots into per-team slot arrays and returns the counts.
 *
 * Allocation-free, like `collectHealthBarRobots`, so it is safe in `useFrame`.
 */
export function collectTeamMarkerRobots<
  T extends { team: TeamId; health: number; maxHealth: number },
>(
  robots: readonly T[],
  out: Record<TeamId, (T | undefined)[]>,
): Record<TeamId, number> {
  const counts: Record<TeamId, number> = { red: 0, blue: 0 };
  for (let i = 0; i < robots.length; i += 1) {
    const robot = robots[i];
    if (!isHealthBarVisible(robot)) {
      continue;
    }
    const team = robot.team;
    const count = counts[team];
    const slots = out[team];
    if (count >= slots.length) {
      continue;
    }
    slots[count] = robot;
    counts[team] = count + 1;
  }
  return counts;
}
