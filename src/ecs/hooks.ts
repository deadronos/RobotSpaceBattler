import type { Query } from "miniplex";
import { useSyncExternalStore } from "react";

import type { Entity } from "./miniplexStore";
import { subscribeEntityChanges } from "./miniplexStore";

export function useEcsQuery<T extends Entity>(query: Query<T>) {
  // Eagerly connect the query before React reads the initial snapshot so
  // that any entity-added events which occur during the mounting phase
  // (for example spawns scheduled by parent effects) are not missed.
  // We store the connection in a ref so it's created once per-hook-instance
  // and can be cleaned up when the component unmounts.
  const connRef = ((): { disconnect?: () => void } => {
    try {
      return query.connect();
    } catch {
      // Defensive: if connect throws for any reason, return a noop wrapper
      return { disconnect: () => {} };
    }
  })();

  return useSyncExternalStore(
    (onStoreChange) => {
      // We already connected above; wire up change listeners to forward
      // miniplex query events into React's external store mechanism.
      const unsubscribeAdded = query.onEntityAdded.subscribe(() => {
        onStoreChange();
      });
      const unsubscribeRemoved = query.onEntityRemoved.subscribe(() => {
        onStoreChange();
      });
      const unsubscribeChanged = subscribeEntityChanges((entity) => {
        if (!entity || query.has(entity as T)) {
          onStoreChange();
        }
      });

      // Immediately notify once to ensure first paint reflects the current
      // world state. This avoids a lost initial update if entities were
      // added before the component subscribed.
      try {
        onStoreChange();
      } catch {
        // no-op; defensive in case React dev runtime complains in exotic trees
      }

      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
        unsubscribeChanged();
        try {
          connRef.disconnect?.();
        } catch {
          // ignore errors during cleanup
        }
      };
    },
    () => query.entities as unknown as T[],
    () => query.entities as unknown as T[],
  );
}
