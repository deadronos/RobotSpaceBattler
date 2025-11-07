import { addVec3, Vec3, vec3 } from './math/vec3';

export type TeamId = 'red' | 'blue';

export interface TeamConfig {
  id: TeamId;
  label: string;
  color: string;
  spawnCenter: Vec3;
  spawnPoints: Vec3[];
  orientation: number;
}

function createSpawnGrid(center: Vec3, columns: number, rows: number, spacing: number): Vec3[] {
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
      const offset = vec3(column * spacing, 0, row * spacing);
      spawnPoints.push(addVec3(center, addVec3(originOffset, offset)));
    }
  }

  return spawnPoints;
}

const RED_CENTER = vec3(-40, 0, 0);
const BLUE_CENTER = vec3(40, 0, 0);

export const TEAM_CONFIGS: Record<TeamId, TeamConfig> = {
  red: {
    id: 'red',
    label: 'Crimson Fleet',
    color: '#ff4d5a',
    spawnCenter: RED_CENTER,
    spawnPoints: createSpawnGrid(vec3(-40, 0, -6), 5, 2, 3),
    orientation: 0,
  },
  blue: {
    id: 'blue',
    label: 'Azure Vanguard',
    color: '#4da6ff',
    spawnCenter: BLUE_CENTER,
    spawnPoints: createSpawnGrid(vec3(40, 0, -6), 5, 2, 3),
    orientation: Math.PI,
  },
};
