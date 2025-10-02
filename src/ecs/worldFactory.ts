import { World } from "miniplex";

export type EntityLifecycleHook<T extends object> = (entity: T) => void;

export interface WorldFactoryOptions<T extends object> {
  onEntityAdded?: EntityLifecycleHook<T>;
  onEntityRemoved?: EntityLifecycleHook<T>;
}

export interface WorldController<T extends object> {
  world: World<T>;
  add(entity: T): T;
  remove(entity: T): void;
  reset(): void;
}

export function createWorldController<T extends object>(
  options: WorldFactoryOptions<T> = {}
): WorldController<T> {
  const world = new World<T>();

  const add = (entity: T) => {
    const added = world.add(entity);
    options.onEntityAdded?.(added);
    return added;
  };

  const remove = (entity: T) => {
    options.onEntityRemoved?.(entity);
    world.remove(entity);
  };

  const reset = () => {
    for (const entity of [...world.entities]) {
      remove(entity);
    }
  };

  return { world, add, remove, reset };
}

