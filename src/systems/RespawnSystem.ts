import type { World } from "miniplex";

import { resolveEntity } from "../ecs/ecsResolve";
import type { Entity, Team } from "../ecs/miniplexStore";
import { removeEntity } from "../ecs/miniplexStore";
import type { WeaponComponent, WeaponType } from "../ecs/weapons";
import { spawnRobot } from "../robots/spawnControls";
import type { DeathEvent } from "./DamageSystem";
import type { StepContext } from "../utils/fixedStepDriver";

const DEFAULT_RESPAWN_DELAY_MS = 5000; // contract expects 5000ms
const DEFAULT_INVULNERABILITY_MS = 2000;
const DEFAULT_MAX_SPAWNS_PER_STEP = 3;

export type SpawnRequest = {
  entityId: string;
  team: Team | string;
  respawnAtMs: number;
  retries?: number;
  spawnZoneId?: string;
};

export type RespawnedEntity = {
  id: string;
  team: string | Team;
  position: [number, number, number];
  invulnerableUntil: number;
};

// Global queue preserved for backward compatibility with runtime wrapper
const respawnQueue: SpawnRequest[] = [];

export interface RespawnSystemOptions {
  respawnDelayMs?: number;
  now?: number;
}

function resolveWeaponType(entity: Entity | undefined): WeaponType {
  const weapon = (entity as Entity & { weapon?: WeaponComponent })?.weapon;
  return weapon?.type ?? "gun";
}

function isTeam(value: unknown): value is Team {
  return value === "red" || value === "blue";
}

export type ProcessRespawnParams = {
  queue: SpawnRequest[];
  stepContext: StepContext;
  spawnConfig?: {
    respawnDelayMs?: number;
    invulnerabilityMs?: number;
    maxSpawnsPerStep?: number;
  };
};

export function processRespawnQueue(params: ProcessRespawnParams) {
  const { queue, stepContext, spawnConfig } = params;
  const now = stepContext.simNowMs;
  const respawnDelayMs = spawnConfig?.respawnDelayMs ?? DEFAULT_RESPAWN_DELAY_MS;
  const invulnerabilityMs = spawnConfig?.invulnerabilityMs ?? DEFAULT_INVULNERABILITY_MS;
  const maxSpawnsPerStep = spawnConfig?.maxSpawnsPerStep ?? DEFAULT_MAX_SPAWNS_PER_STEP;

  // Keep FIFO ordering; split ready and pending
  const ready: SpawnRequest[] = [];
  const pending: SpawnRequest[] = [];

  for (const req of queue) {
    if (req.respawnAtMs <= now) ready.push({ ...req });
    else pending.push({ ...req });
  }

  const toSpawn = ready.slice(0, maxSpawnsPerStep);
  const overflow = ready.slice(maxSpawnsPerStep);

  const respawned: RespawnedEntity[] = toSpawn.map((r) => ({
    id: r.entityId,
    team: r.team,
    position: [0, 0, 0],
    invulnerableUntil: now + invulnerabilityMs,
  }));

  const remainingQueue: SpawnRequest[] = [...overflow, ...pending];

  return { respawned, remainingQueue };
}

// Backwards-compatible runtime wrapper. Supports both old and new call shapes.
export function respawnSystem(
  a: World<Entity> | ProcessRespawnParams,
  b?: DeathEvent[] | undefined,
  c?: RespawnSystemOptions,
) {
  // New API: called as respawnSystem({ queue, stepContext, spawnConfig }) from tests
  if (typeof (a as ProcessRespawnParams).stepContext !== "undefined") {
    const params = a as ProcessRespawnParams;
    return processRespawnQueue(params);
  }

  // Old API: respawnSystem(world, deathEvents, options)
  const world = a as World<Entity>;
  const deathEvents = (b as DeathEvent[]) ?? [];
  const options = c ?? {};

  const now = options.now ?? Date.now();
  const respawnDelayMs = options.respawnDelayMs ?? DEFAULT_RESPAWN_DELAY_MS;

  for (const death of deathEvents) {
    const entity = resolveEntity(world, death.entityId);
    const team = (death.team ?? entity?.team) as Team | undefined;
    if (!isTeam(team)) continue;

    const weaponType = resolveWeaponType(entity);

    respawnQueue.push({
      entityId: String(death.entityId),
      team,
      respawnAtMs: now + respawnDelayMs,
      spawnZoneId: undefined,
    });

    if (entity) {
      removeEntity(entity);
    }
  }

  // Process the global queue deterministically using a synthetic stepContext
  const syntheticStepContext: StepContext = {
    frameCount: 0,
    simNowMs: now,
    rng: () => 0,
    step: 1 / 60,
    idFactory: () => String(now),
  };

  const { respawned, remainingQueue } = processRespawnQueue({
    queue: [...respawnQueue],
    stepContext: syntheticStepContext,
  });

  // Update the global queue
  respawnQueue.length = 0;
  respawnQueue.push(...remainingQueue);

  // Perform real spawns for runtime
  for (const r of respawned) {
    // Use resolved weapon type where possible; simple spawn for now
    spawnRobot(r.team as Team, ("gun" as WeaponType));
  }

  return;
}

export function clearRespawnQueue() {
  respawnQueue.length = 0;
}
