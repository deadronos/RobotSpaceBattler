export type LaserBeamVisualEvent = {
  type: "laser-beam";
  id: string;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  durationMs?: number;
  color?: string;
};

export type RocketExplosionVisualEvent = {
  type: "rocket-explosion";
  id: string;
  position: [number, number, number];
  radius: number;
  durationMs?: number;
  color?: string;
};

export type GunTracerVisualEvent = {
  type: "gun-tracer";
  id: string;
  startPosition: [number, number, number];
  impactPosition: [number, number, number];
  durationMs?: number;
  color?: string;
};

export type WeaponVisualEvent =
  | LaserBeamVisualEvent
  | RocketExplosionVisualEvent
  | GunTracerVisualEvent;

type WeaponVisualEventListener<T extends WeaponVisualEvent> = (event: T) => void;

type ListenerBucket = Set<WeaponVisualEventListener<WeaponVisualEvent>>;

export interface WeaponVisualEventEmitter {
  on<K extends WeaponVisualEvent["type"]>(
    type: K,
    listener: WeaponVisualEventListener<Extract<WeaponVisualEvent, { type: K }>>,
  ): () => void;
  emit(event: WeaponVisualEvent): void;
  clear(): void;
}

export function createWeaponVisualEventEmitter(): WeaponVisualEventEmitter {
  const listeners: Partial<
    Record<WeaponVisualEvent["type"], ListenerBucket>
  > = {};

  function on<K extends WeaponVisualEvent["type"]>(
    type: K,
    listener: WeaponVisualEventListener<Extract<WeaponVisualEvent, { type: K }>>,
  ): () => void {
    const bucket =
      (listeners[type] as ListenerBucket) ??
      new Set<WeaponVisualEventListener<WeaponVisualEvent>>();
    bucket.add(listener as WeaponVisualEventListener<WeaponVisualEvent>);
    listeners[type] = bucket;

    return () => {
      bucket.delete(listener as WeaponVisualEventListener<WeaponVisualEvent>);
    };
  }

  function emit(event: WeaponVisualEvent): void {
    const bucket = listeners[event.type];
    if (!bucket) {
      return;
    }

    bucket.forEach((listener) => listener(event));
  }

  function clear(): void {
    Object.keys(listeners).forEach((key) => {
      listeners[key as WeaponVisualEvent["type"]]?.clear();
    });
  }

  return {
    on,
    emit,
    clear,
  };
}
