import type { Query,World } from "miniplex";

import type { RuntimeEventLog } from "../utils/runtimeEventLog";
import { type Entity, getEntityById } from "./miniplexStore";
import type { WeaponComponent } from "./weapons";

export interface OwnerLookup {
  ownerId?: number | string;
  weaponId?: string;
}

// Singleton runtime event log accessor
let _runtimeEventLog: RuntimeEventLog | null = null;

/**
 * Set the global runtime event log instance.
 * Should be called during Simulation initialization.
 */
export function setRuntimeEventLog(log: RuntimeEventLog) {
  _runtimeEventLog = log;
}

/**
 * Get the global runtime event log instance.
 * Returns null if not yet initialized.
 */
export function getRuntimeEventLog(): RuntimeEventLog | null {
  return _runtimeEventLog;
}

/**
 * Clear the global runtime event log reference.
 * Useful for cleanup in tests.
 */
export function clearRuntimeEventLog() {
  _runtimeEventLog = null;
}

export function resolveEntity(
  world: World<Entity>,
  id?: number | string,
): (Entity & { id: string | number }) | undefined {
  if (id === undefined) return undefined;
  const idStr = String(id);

  // Try direct lookup by id string first
  const direct = getEntityById(idStr) as (Entity & { id: string | number }) | undefined;
  if (direct) return direct;

  // Fall back to scanning gameplayId or id fields
  return Array.from(world.entities).find((candidate) => {
    const c = candidate as Entity & { id?: string; gameplayId?: string };
    return c.id === idStr || c.gameplayId === idStr;
  }) as (Entity & { id: string | number }) | undefined;
}

export function resolveOwner(
  world: World<Entity>,
  lookup: OwnerLookup,
): (Entity & { weapon?: WeaponComponent }) | undefined {
  const direct = resolveEntity(world, lookup.ownerId);
  if (direct) {
    return direct as Entity & { weapon?: WeaponComponent };
  }

  if (!lookup.weaponId) {
    return undefined;
  }

  try {
    const query = world.with("weapon") as Query<Entity & { weapon?: WeaponComponent }>;

    const match = query.entities.find(
      (candidate) => candidate.weapon?.id === lookup.weaponId,
    );
    if (match) {
      return match;
    }
  } catch {
    /* fall back to world scan */
  }

  return Array.from(world.entities).find((candidate) => {
    const entity = candidate as Entity & { weapon?: WeaponComponent };
    return entity.weapon?.id === lookup.weaponId;
  }) as (Entity & { weapon?: WeaponComponent }) | undefined;
}
