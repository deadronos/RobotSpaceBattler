import type { World } from "miniplex";

import type { Entity, Team } from "../ecs/miniplexStore";
import { getEntityById, removeEntity } from "../ecs/miniplexStore";
import type { WeaponComponent, WeaponType } from "../ecs/weapons";
import { spawnRobot } from "../robots/spawnControls";
import type { DeathEvent } from "./DamageSystem";

const DEFAULT_RESPAWN_DELAY_MS = 3000;

type RespawnQueueEntry = {
  team: Team;
  weaponType: WeaponType;
  respawnAt: number;
};

const respawnQueue: RespawnQueueEntry[] = [];

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

function resolveEntity(world: World<Entity>, id: number) {
  const direct = getEntityById(id) as Entity | undefined;
  if (direct) return direct;
  return Array.from(world.entities).find(
    (candidate) => (candidate.id as unknown as number) === id,
  ) as Entity | undefined;
}

export function respawnSystem(
  world: World<Entity>,
  deathEvents: DeathEvent[],
  options: RespawnSystemOptions = {},
) {
  const now = options.now ?? Date.now();
  const respawnDelayMs = options.respawnDelayMs ?? DEFAULT_RESPAWN_DELAY_MS;

  for (const death of deathEvents) {
    const entity = resolveEntity(world, death.entityId);
    const team = (death.team ?? entity?.team) as Team | undefined;
    if (!isTeam(team)) continue;

    const weaponType = resolveWeaponType(entity);

    respawnQueue.push({
      team,
      weaponType,
      respawnAt: now + respawnDelayMs,
    });

    if (entity) {
      removeEntity(entity);
    }
  }

  if (respawnQueue.length === 0) {
    return;
  }

  const pending: RespawnQueueEntry[] = [];
  const ready: RespawnQueueEntry[] = [];

  for (const entry of respawnQueue) {
    if (entry.respawnAt <= now) {
      ready.push(entry);
    } else {
      pending.push(entry);
    }
  }

  respawnQueue.length = 0;
  respawnQueue.push(...pending);

  for (const entry of ready) {
    spawnRobot(entry.team, entry.weaponType);
  }
}

export function clearRespawnQueue() {
  respawnQueue.length = 0;
}
