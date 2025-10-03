import type { Query } from "miniplex";
import { useRef, useSyncExternalStore } from "react";

import type { Entity } from "./miniplexStore";
import { subscribeEntityChanges } from "./miniplexStore";

export function useEcsQuery<T extends Entity>(query: Query<T>) {
  // Create and hold the query connection for the hook instance. We prefer
  // to connect synchronously so that any entities created during the mount
  // phase are visible to the query subscription immediately. Connect is
  // defensive (try/catch) and returns a simple disconnect wrapper.
  const connRef = useRef<{ disconnect?: () => void } | null>(null);
  if (connRef.current === null) {
    try {
      connRef.current = query.connect();
    } catch {
      connRef.current = { disconnect: () => {} };
    }
  }

  return useSyncExternalStore(
    (onStoreChange) => {
      // Wire up listeners to forward miniplex query events into React.
      const unsubscribeAdded = query.onEntityAdded.subscribe(() =>
        onStoreChange(),
      );
      const unsubscribeRemoved = query.onEntityRemoved.subscribe(() =>
        onStoreChange(),
      );
      const unsubscribeChanged = subscribeEntityChanges((entity) => {
        if (!entity || query.has(entity as T)) onStoreChange();
      });

      // Immediately notify once to ensure first paint reflects the current
      // world state. This avoids a lost initial update if entities were
      // added before the component subscribed.
      try {
        onStoreChange();
      } catch {
        // defensive - ignore errors from React internals
      }
      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
        unsubscribeChanged();
        try {
          connRef.current?.disconnect?.();
        } catch {
          // ignore errors during cleanup
        }
        connRef.current = null;
      };
    },
    () => query.entities as unknown as T[],
    () => query.entities as unknown as T[],
  );
}
