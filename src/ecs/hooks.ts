import type { Query } from 'miniplex';
import { useEffect, useSyncExternalStore } from 'react';

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

      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
      };
    },
    () => query.entities,
    () => query.entities
  );
}
