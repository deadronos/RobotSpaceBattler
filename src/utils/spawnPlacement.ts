import type { SpawnZone } from "../ecs/spawnModel";

type Vector3 = { x: number; y: number; z: number };

type EnemyLike = { position: Vector3 };

export interface SpawnPlacementInput {
  enemies: EnemyLike[];
  spawnZones: SpawnZone[];
  minSpawnDistance: number;
  stepContext: {
    rng: () => number;
  };
}

export interface SpawnPlacementResult {
  zoneId: string;
  spawnPointId: string;
  position: Vector3;
}

export function computeSpawnPlacement(
  input: SpawnPlacementInput,
): SpawnPlacementResult {
  const candidates: Array<{ zone: SpawnZone; point: { id: string; position: Vector3 } }> = [];

  for (const zone of input.spawnZones) {
    for (const point of zone.spawnPoints) {
      const distanceOk = input.enemies.every((enemy) => {
        return distance(point.position, enemy.position) >= input.minSpawnDistance;
      });
      if (distanceOk) {
        candidates.push({ zone, point });
      }
    }
  }

  if (candidates.length === 0) {
    const fallbackZone = input.spawnZones[0];
    const fallbackPoint = fallbackZone.spawnPoints[0];
    return {
      zoneId: fallbackZone.id,
      spawnPointId: fallbackPoint.id,
      position: fallbackPoint.position,
    };
  }

  const idx = Math.floor(input.stepContext.rng() * candidates.length) % candidates.length;
  const choice = candidates[idx];
  return {
    zoneId: choice.zone.id,
    spawnPointId: choice.point.id,
    position: choice.point.position,
  };
}

function distance(a: Vector3, b: Vector3) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
