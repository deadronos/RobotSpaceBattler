import { addVec3, Vec3, vec3 } from "./math/vec3";

/**
 * Identifier for the teams.
 */
export type TeamId = "red" | "blue";

/**
 * Configuration data for a team.
 */
export interface TeamConfig {
  /** The unique identifier for the team. */
  id: TeamId;
  /** The display name of the team. */
  label: string;
  /** The color associated with the team (hex string). */
  color: string;
  /** The center point of the team's spawn area. */
  spawnCenter: Vec3;
  /** The list of spawn points for individual robots. */
  spawnPoints: Vec3[];
  /** The initial orientation (in radians) for robots on this team. */
  orientation: number;
}

/**
 * Generates a random number within a range.
 * @param min - The minimum value.
 * @param max - The maximum value.
 * @returns A random number between min and max.
 */
function randRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Create a grid of spawn points around `center` but with small random jitter
 * and an optional tiny rotation per-point so spawns are not perfectly symmetric.
 *
 * @param center - The center point of the grid.
 * @param columns - Number of columns in the grid.
 * @param rows - Number of rows in the grid.
 * @param spacing - Spacing between points.
 * @param pointJitter - Maximum random offset for each point (default 0.45).
 * @param rotationJitter - Maximum random rotation angle for grid calculation (default 0.10).
 * @param lateralBias - Bias to push outer columns outward (default 0).
 * @returns An array of Vec3 spawn points.
 */
function createSpawnGrid(
  center: Vec3,
  columns: number,
  rows: number,
  spacing: number,
  pointJitter = 0.45,
  rotationJitter = 0.1,
  lateralBias = 0,
): Vec3[] {
  const halfColumns = columns - 1;
  const halfRows = rows - 1;
  const originOffset = vec3(
    -((halfColumns / 2) * spacing),
    0,
    -((halfRows / 2) * spacing),
  );

  const spawnPoints: Vec3[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const baseOffset = vec3(column * spacing, 0, row * spacing);
      // Small per-point rotation around the center to break strict grid symmetry
      const angle = randRange(-rotationJitter, rotationJitter);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const localX = originOffset.x + baseOffset.x;
      const localZ = originOffset.z + baseOffset.z;
      const rotX = localX * cosA - localZ * sinA;
      const rotZ = localX * sinA + localZ * cosA;

      // Add a small random jitter to spread spawn locations
      const jitterX = randRange(-pointJitter, pointJitter);
      const jitterZ = randRange(-pointJitter, pointJitter);

      // Optionally push outer columns further outward toward arena corners.
      // lateralBias is the maximum extra distance applied proportionally to how
      // far the spawn column is from the grid center. The sign of the push
      // follows the team center's X sign so teams move outward along X.
      const maxAbsX = ((columns - 1) / 2) * spacing || 1;
      const normalizedX = Math.abs(localX) / maxAbsX; // 0..1 across grid
      const sideSign = Math.sign(center.x) || 1;
      const outwardPush =
        sideSign * normalizedX * lateralBias * randRange(0.4, 1.0);

      const final = addVec3(
        center,
        vec3(rotX + jitterX + outwardPush, 0, rotZ + jitterZ),
      );
      spawnPoints.push(final);
    }
  }

  return spawnPoints;
}

// Slightly jittered team centers to avoid perfect left/right symmetry.
// The offsets are intentionally small so layout remains familiar while varying
// each match enough to change flow and line-of-sight.
const RED_CENTER = vec3(-40 + randRange(-2.0, 2.0), 0, randRange(-1.5, 1.5));
const BLUE_CENTER = vec3(40 + randRange(-2.0, 2.0), 0, randRange(-1.5, 1.5));

/**
 * Configuration for both teams (red and blue).
 */
export const TEAM_CONFIGS: Record<TeamId, TeamConfig> = {
  red: {
    id: "red",
    label: "Crimson Fleet",
    color: "#ff4d5a",
    spawnCenter: RED_CENTER,
    // The spawn grid itself gets a modest per-point jitter and tiny rotation so
    // squads do not line up the same way every match. We also push outer
    // columns outward (lateralBias) so spawn X offsets can reach toward the
    // arena corners and produce wider flanking starts.
    spawnPoints: createSpawnGrid(
      addVec3(RED_CENTER, vec3(0, 0, -6)),
      5,
      2,
      3,
      0.6,
      0.12,
      8.0,
    ),
    orientation: 0,
  },
  blue: {
    id: "blue",
    label: "Azure Vanguard",
    color: "#4da6ff",
    spawnCenter: BLUE_CENTER,
    spawnPoints: createSpawnGrid(
      addVec3(BLUE_CENTER, vec3(0, 0, -6)),
      5,
      2,
      3,
      0.6,
      0.12,
      8.0,
    ),
    orientation: Math.PI,
  },
};
