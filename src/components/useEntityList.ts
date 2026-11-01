import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";

import type { BattleEntity, Store } from "../ecs/worldTypes";

function sameMembers<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Subscribes a component to the *membership* of an ECS store.
 *
 * The store hands out a fresh array whenever any entity is added or removed,
 * so identity alone is not a usable signal. This polls once per frame (a
 * pointer comparison in the common case) and only triggers a React render when
 * the set of entities really changed (a robot spawned or died), never because
 * entities moved. Per-frame motion is applied imperatively by the children.
 *
 * @param store - The ECS store to observe.
 * @param filter - Optional predicate, applied before the membership check.
 * @returns The current list of member entities.
 */
export function useEntityList<T extends BattleEntity>(
  store: Store<T>,
  filter?: (entity: T) => boolean,
): readonly T[] {
  const select = (source: T[]) => (filter ? source.filter(filter) : source);
  const [list, setList] = useState<readonly T[]>(() => select(store.entities));
  const lastRef = useRef(list);

  useFrame(() => {
    const next = select(store.entities);
    if (!sameMembers(next, lastRef.current)) {
      lastRef.current = next;
      setList(next);
    }
  });

  return list;
}
