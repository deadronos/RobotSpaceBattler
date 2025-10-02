import type { World } from "miniplex";

import { type Entity, getEntityById } from "./miniplexStore";
import type { WeaponComponent } from "./weapons";

export interface OwnerLookup {
  ownerId?: number | string;
  weaponId?: string;
}

export function resolveEntity(
  world: World<Entity>,
  id?: number | string,
): (Entity & { id: string | number }) | undefined {
  if (typeof id === "number") {
    const direct = getEntityById(id) as (Entity & { id: string | number }) | undefined;
    if (direct) {
      return direct;
    }

    return Array.from(world.entities).find((candidate) => {
      const numericId = candidate.id as unknown as number;
      return numericId === id;
    }) as (Entity & { id: string | number }) | undefined;
  }

  if (typeof id === "string") {
    return Array.from(world.entities).find(
      (candidate) => candidate.id === id,
    ) as (Entity & { id: string | number }) | undefined;
  }

  return undefined;
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
    const query = world.with("weapon") as unknown as {
      entities: Array<Entity & { weapon?: WeaponComponent }>;
    };

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
