export type EntityId = number | string;

export interface IdentifiableEntity {
  id?: EntityId;
}

export type EntityChangeListener<T> = (entity: T | undefined) => void;

export interface EntityLookup<T extends IdentifiableEntity> {
  ensureEntityId(entity: T): number | undefined;
  track(entity: T): void;
  untrack(entity: T): void;
  getById(id: number): T | undefined;
  clear(): void;
  subscribe(listener: EntityChangeListener<T>): () => void;
  notify(entity: T | undefined): void;
  nextNumericId(): number;
}

export function createEntityLookup<T extends IdentifiableEntity>(): EntityLookup<T> {
  let nextId = 1;
  const lookup = new Map<number, T>();
  const listeners = new Set<EntityChangeListener<T>>();

  const track = (entity: T) => {
    if (typeof entity.id === "number") {
      lookup.set(entity.id, entity);
      if (entity.id >= nextId) {
        nextId = entity.id + 1;
      }
    }
  };

  const untrack = (entity: T) => {
    if (typeof entity.id === "number") {
      lookup.delete(entity.id);
    }
  };

  const ensureEntityId = (entity: T) => {
    if (typeof entity.id !== "number") {
      const generatedId = nextId++;
      (entity as T & { id: number }).id = generatedId;
      lookup.set(generatedId, entity);
      return generatedId;
    }

    track(entity);
    return entity.id;
  };

  const getById = (id: number) => lookup.get(id);

  const clear = () => {
    lookup.clear();
    nextId = 1;
  };

  const subscribe = (listener: EntityChangeListener<T>) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const notify = (entity: T | undefined) => {
    if (listeners.size === 0) return;
    for (const listener of listeners) {
      try {
        listener(entity);
      } catch {
        // Listener errors are swallowed to keep simulation resilient.
      }
    }
  };

  const nextNumericId = () => nextId++;

  return {
    ensureEntityId,
    track,
    untrack,
    getById,
    clear,
    subscribe,
    notify,
    nextNumericId,
  };
}
