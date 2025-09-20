import type { Query } from 'miniplex';
import { useEffect, useSyncExternalStore } from 'react';

import type { Entity } from './miniplexStore';
import { subscribeEntityChanges } from './miniplexStore';

export function useEcsQuery<T extends Entity>(query: Query<T>) {
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
      const unsubscribeChanged = subscribeEntityChanges((entity) => {
        if (!entity || query.has(entity as T)) {
          onStoreChange();
        }
      });

      return () => {
        unsubscribeAdded();
        unsubscribeRemoved();
        unsubscribeChanged();
      };
    },
    () => query.entities,
    () => query.entities
  );
}
