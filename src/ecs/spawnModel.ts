import { ensureGameplayId, normalizeTeam, type Team } from "./id";

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface SpawnPoint {
  id: string;
  position: Vector3Like;
}

export interface SpawnZone {
  id: string;
  team?: Team;
  spawnPoints: SpawnPoint[];
  capacity?: number;
}

export interface SpawnRequest {
  entityId: string;
  team: Team;
  respawnAtMs: number;
  retries?: number;
  spawnZoneId?: string;
}

export interface SpawnQueue {
  zoneId: string;
  requests: SpawnRequest[];
  maxPerZone: number;
}

type SpawnQueueInit = {
  zoneId: string;
  requests?: SpawnRequest[];
  maxPerZone?: number;
};

export function createSpawnQueue(init: SpawnQueueInit): SpawnQueue {
  const zoneId = ensureGameplayId(init.zoneId);
  const requests = (init.requests ?? []).map((request) => ({
    entityId: ensureGameplayId(request.entityId),
    team: normalizeTeam(request.team),
    respawnAtMs: request.respawnAtMs,
    retries: request.retries ?? 0,
    spawnZoneId: request.spawnZoneId
      ? ensureGameplayId(request.spawnZoneId)
      : undefined,
  }));

  return {
    zoneId,
    requests,
    maxPerZone: init.maxPerZone ?? 3,
  };
}
