import type { LightingConfig, Obstacle, SpawnZone, Team, Vector3 } from '../../types';

export interface ArenaEntity {
  id: string;
  dimensions: Vector3;
  spawnZoneRadius: number;
  obstacles: Obstacle[];
  lightingConfig: LightingConfig;
  boundaries: {
    min: Vector3;
    max: Vector3;
  };
  spawnZones: Record<Team, SpawnZone>;
}

const BASE_SPAWN_POINTS: Vector3[] = [
  { x: 0, y: 0, z: 0 },
  { x: -4, y: 0, z: -3 },
  { x: -4, y: 0, z: 3 },
  { x: -8, y: 0, z: -3 },
  { x: -8, y: 0, z: 3 },
  { x: -4, y: 0, z: -6 },
  { x: -4, y: 0, z: 6 },
  { x: -8, y: 0, z: -6 },
  { x: -8, y: 0, z: 6 },
  { x: -6, y: 0, z: 0 },
];

function buildSpawnZone(team: Team): SpawnZone {
  const direction = team === 'red' ? -1 : 1;
  const center: Vector3 = { x: direction * 30, y: 0, z: 0 };
  const spawnPoints = BASE_SPAWN_POINTS.map((offset) => ({
    x: center.x + offset.x * direction * -1,
    y: 0,
    z: center.z + offset.z,
  }));

  return {
    center,
    radius: 10,
    spawnPoints,
  };
}

export function createDefaultArena(): ArenaEntity {
  const spawnZones: Record<Team, SpawnZone> = {
    red: buildSpawnZone('red'),
    blue: buildSpawnZone('blue'),
  };

  return {
    id: 'main-arena',
    dimensions: { x: 120, y: 40, z: 80 },
    spawnZoneRadius: 10,
    obstacles: [
      {
        position: { x: -10, y: 0, z: 0 },
        dimensions: { x: 4, y: 4, z: 4 },
        isCover: true,
      },
      {
        position: { x: -5, y: 0, z: 10 },
        dimensions: { x: 4, y: 4, z: 4 },
        isCover: true,
      },
      {
        position: { x: 5, y: 0, z: -10 },
        dimensions: { x: 4, y: 4, z: 4 },
        isCover: true,
      },
      {
        position: { x: 10, y: 0, z: 0 },
        dimensions: { x: 4, y: 4, z: 4 },
        isCover: true,
      },
    ],
    lightingConfig: {
      ambientColor: '#0a0a1a',
      ambientIntensity: 0.4,
      directionalColor: '#ffffff',
      directionalIntensity: 0.8,
      shadowsEnabled: true,
    },
    boundaries: {
      min: { x: -60, y: 0, z: -40 },
      max: { x: 60, y: 0, z: 40 },
    },
    spawnZones,
  };
}

export function getSpawnZone(arena: ArenaEntity, team: Team): SpawnZone {
  return arena.spawnZones[team];
}
