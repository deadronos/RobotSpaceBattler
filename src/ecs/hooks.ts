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
  // Track a revision so snapshots update even when the underlying
  // query.entities array reference is reused by miniplex.
  const revisionRef = useRef(0);
  const snapshotRef = useRef<{ revision: number; value: T[] }>({
    revision: -1,
    value: query.entities.slice() as T[],
  });
  if (connRef.current === null) {
    try {
      connRef.current = query.connect();
    } catch {
      connRef.current = { disconnect: () => {} };
    }
  }

  return useSyncExternalStore(
    (onStoreChange) => {
      const emitChange = () => {
        revisionRef.current += 1;
        onStoreChange();
      };
      // Wire up listeners to forward miniplex query events into React.
      const unsubscribeAdded = query.onEntityAdded.subscribe(emitChange);
      const unsubscribeRemoved = query.onEntityRemoved.subscribe(emitChange);
      const unsubscribeChanged = subscribeEntityChanges((entity) => {
        if (!entity || query.has(entity as T)) emitChange();
      });

      // Immediately notify once to ensure first paint reflects the current
      // world state. This avoids a lost initial update if entities were
      // added before the component subscribed.
      try {
        emitChange();
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
    () => {
      if (snapshotRef.current.revision !== revisionRef.current) {
        snapshotRef.current = {
          revision: revisionRef.current,
          value: query.entities.slice() as T[],
        };
      }
      return snapshotRef.current.value;
    },
    () => {
      if (snapshotRef.current.revision !== revisionRef.current) {
        snapshotRef.current = {
          revision: revisionRef.current,
          value: query.entities.slice() as T[],
        };
      }
      return snapshotRef.current.value;
    },
  );
}
