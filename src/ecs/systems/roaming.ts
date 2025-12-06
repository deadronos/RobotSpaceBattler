import { Vec3, vec3 } from '../../lib/math/vec3';
import { ARENA_BOUNDS } from '../../simulation/environment/arenaGeometry';
import { RobotAIState } from '../world';

const ROAM_MARGIN = 6;
const ROAM_BASE_DURATION = 3000;
const ROAM_EXTRA_WINDOW = 4000;

/**
 * Updates the robot's roaming target if the current one is expired or missing.
 *
 * @param aiState - The robot's AI state to update.
 * @param elapsedMs - Current simulation time in milliseconds.
 * @param rng - Random number generator.
 */
export function refreshRoamTarget(aiState: RobotAIState, elapsedMs: number, rng: () => number): void {
  const now = elapsedMs;
  const roamUntil = aiState.roamUntil ?? 0;

  if (!aiState.roamTarget || (roamUntil && roamUntil <= now)) {
    const roamPoint = pickRandomRoamPoint(rng);
    aiState.roamTarget = roamPoint;
    aiState.searchPosition = roamPoint;
    aiState.roamUntil = now + ROAM_BASE_DURATION + Math.floor(rng() * ROAM_EXTRA_WINDOW);
  } else if (aiState.roamTarget) {
    aiState.searchPosition = aiState.roamTarget;
  }
}

/**
 * Picks a random point within the arena for roaming.
 * Respects a margin from the arena walls.
 *
 * @param rng - Random number generator.
 * @returns A random Vec3 position.
 */
function pickRandomRoamPoint(rng: () => number): Vec3 {
  const minX = ARENA_BOUNDS.min.x + ROAM_MARGIN;
  const maxX = ARENA_BOUNDS.max.x - ROAM_MARGIN;
  const minZ = ARENA_BOUNDS.min.z + ROAM_MARGIN;
  const maxZ = ARENA_BOUNDS.max.z - ROAM_MARGIN;
  const rx = minX + rng() * (maxX - minX);
  const rz = minZ + rng() * (maxZ - minZ);
  return vec3(rx, 0, rz);
}
