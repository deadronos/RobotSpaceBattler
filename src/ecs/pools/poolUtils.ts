export interface GenericPoolStats {
  created: number;
  reused: number;
  released: number;
}

export interface GenericPool<T> {
  acquire: () => T;
  release: (item: T) => void;
  reset: () => void;
  getFreeCount: () => number;
  getStats: () => GenericPoolStats;
}

export function createGenericPool<T>(
  initialSize: number,
  createItem: () => T,
  resetItem: (item: T) => void,
): GenericPool<T> {
  const free: T[] = [];
  const stats: GenericPoolStats = {
    created: 0,
    reused: 0,
    released: 0,
  };

  const seed = Math.max(0, initialSize);
  for (let index = 0; index < seed; index += 1) {
    free.push(createItem());
  }

  function acquire(): T {
    const item = free.pop();
    if (item) {
      stats.reused += 1;
      return item;
    }
    stats.created += 1;
    return createItem();
  }

  function release(item: T): void {
    resetItem(item);
    stats.released += 1;
    free.push(item);
  }

  function reset(): void {
    free.splice(0, free.length);
    stats.created = 0;
    stats.reused = 0;
    stats.released = 0;
    for (let index = 0; index < seed; index += 1) {
      free.push(createItem());
    }
  }

  return {
    acquire,
    release,
    reset,
    getFreeCount: () => free.length,
    getStats: () => ({ ...stats }),
  };
}
