import type { Query } from "miniplex";
import { useEffect, useSyncExternalStore } from "react";

export function useEcsQuery<T>(query: Query<T>) {
  useEffect(() => {
    const connected = query.connect();
    return () => {
      connected.disconnect();
    };
  }, [query]);

  return useSyncExternalStore(
    (onStoreChange) => {
      const unsubscribeAdded = query.onEntityAdded.subscribe(() => {
        onStoreChange();
      });
      const unsubscribeRemoved = query.onEntityRemoved.subscribe(() => {
        onStoreChange();
      });

      // Important: trigger an initial store change so that if entities were
      // added before this subscription connected (e.g., during mount effects),
      // React schedules a re-render to pick them up.
      // Use a microtask to avoid setState during render warnings.
      Promise.resolve().then(() => onStoreChange());

      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
      };
    },
    () => query.entities,
    () => query.entities,
  );
}
