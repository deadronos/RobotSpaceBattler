import type { Query } from "miniplex";
import { useSyncExternalStore } from "react";

import type { Entity } from "./miniplexStore";
import { subscribeEntityChanges } from "./miniplexStore";

export function useEcsQuery<T extends Entity>(query: Query<T>) {
  return useSyncExternalStore(
    (onStoreChange) => {
      // Connect the query immediately so it materializes its initial set
      // before we capture the first snapshot.
      const connected = query.connect();

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

  // Defer initial notify to next microtask to avoid update-depth loops
  Promise.resolve().then(() => onStoreChange());

      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
        unsubscribeChanged();
        connected.disconnect();
      };
    },
    () => query.entities as unknown as T[],
    () => query.entities as unknown as T[],
  );
}
