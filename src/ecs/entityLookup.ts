export type EntityId = string;

export interface IdentifiableEntity {
  id?: EntityId;
}

export type EntityChangeListener<T> = (entity: T | undefined) => void;

export interface EntityLookup<T extends IdentifiableEntity> {
  ensureEntityId(entity: T): string | undefined;
  track(entity: T): void;
  untrack(entity: T): void;
  getById(id: string): T | undefined;
  clear(): void;
  subscribe(listener: EntityChangeListener<T>): () => void;
  notify(entity: T | undefined): void;
  nextNumericId(): number;
}

export function createEntityLookup<
  T extends IdentifiableEntity,
>(): EntityLookup<T> {
  let nextId = 1;
  const lookup = new Map<string, T>();
  const listeners = new Set<EntityChangeListener<T>>();

  const track = (entity: T) => {
    if (typeof entity.id === "string") {
      lookup.set(entity.id, entity);
      const asNum = Number(entity.id);
      if (!Number.isNaN(asNum) && asNum >= nextId) {
        nextId = Math.floor(asNum) + 1;
      }
    }
  };

  const untrack = (entity: T) => {
    if (typeof entity.id === "string") {
      lookup.delete(entity.id);
    }
  };

  const ensureEntityId = (entity: T) => {
    if (typeof entity.id !== "string") {
      const generatedId = String(nextId++);
      (entity as T & { id: string }).id = generatedId;
      lookup.set(generatedId, entity);
      return generatedId;
    }

    track(entity);
    return entity.id;
  };

  const getById = (id: string) => lookup.get(id);

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
