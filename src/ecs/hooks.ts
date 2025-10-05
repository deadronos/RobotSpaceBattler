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

  // Cache a snapshot reference so getSnapshot returns the same object
  // identity between calls unless the underlying query.entities actually
  // changes. React warns and can enter an infinite update loop if the
  // snapshot returns a fresh array on every call.
  const snapshotRef = useRef<T[] | null>(null);
  if (snapshotRef.current === null) {
    // Initialize once, keep the same reference until we update it
    snapshotRef.current = [...query.entities as T[]];
  }

  return useSyncExternalStore(
    (onStoreChange) => {
      // Helper to refresh the cached snapshot before notifying React
      const refreshSnapshot = () => {
        snapshotRef.current = [...query.entities as T[]];
      };

      // Wire up listeners to forward miniplex query events into React.
      const unsubscribeAdded = query.onEntityAdded.subscribe(() => {
        refreshSnapshot();
        onStoreChange();
      });
      const unsubscribeRemoved = query.onEntityRemoved.subscribe(() => {
        refreshSnapshot();
        onStoreChange();
      });
      const unsubscribeChanged = subscribeEntityChanges((entity) => {
        if (!entity || query.has(entity as T)) {
          refreshSnapshot();
          onStoreChange();
        }
      });

      // Immediately refresh snapshot and notify once to ensure first
      // paint reflects the current world state. This avoids a lost initial
      // update if entities were added before the component subscribed.
      try {
        refreshSnapshot();
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
        snapshotRef.current = null;
      };
    },
    () => snapshotRef.current as T[],
    () => snapshotRef.current as T[],
  );
}
