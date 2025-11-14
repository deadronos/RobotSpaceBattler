export interface VisualPoolOptions {
  maxSize?: number;
}

export class VisualPool<T> {
  private readonly pool: T[] = [];

  constructor(
    private readonly factory: () => T,
    private readonly options: VisualPoolOptions = {},
  ) {}

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(instance: T): void {
    const { maxSize } = this.options;
    if (maxSize != null && this.pool.length >= maxSize) {
      return;
    }

    this.pool.push(instance);
  }

  size(): number {
    return this.pool.length;
  }
}
