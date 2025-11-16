import { createVisualTelemetryEmitter } from './telemetry';

export type VisualInstanceCategory = 'bullets' | 'rockets' | 'lasers' | 'effects';

export interface VisualInstanceManagerConfig {
  maxInstances: Record<VisualInstanceCategory, number>;
}

export type VisualInstanceTelemetryEventType =
  | 'VFX:Instancing:Alloc'
  | 'VFX:Instancing:Release'
  | 'VFX:Instancing:Fallback';

export interface VisualInstanceTelemetryEvent {
  type: VisualInstanceTelemetryEventType;
  category: VisualInstanceCategory;
  entityId: string;
  index?: number;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface VisualInstanceTelemetryEmitter {
  emit: (event: VisualInstanceTelemetryEvent) => void;
}

interface InstanceState {
  freeIndices: number[];
  allocations: Map<string, number>;
  capacity: number;
}

export class VisualInstanceManager {
  private readonly states: Record<VisualInstanceCategory, InstanceState>;

  constructor(
    config: VisualInstanceManagerConfig,
    private readonly telemetry: VisualInstanceTelemetryEmitter = createVisualTelemetryEmitter(),
  ) {
    this.states = {
      bullets: this.createState(config.maxInstances.bullets ?? 0),
      rockets: this.createState(config.maxInstances.rockets ?? 0),
      lasers: this.createState(config.maxInstances.lasers ?? 0),
      effects: this.createState(config.maxInstances.effects ?? 0),
    };
  }

  private createState(capacity: number): InstanceState {
    return {
      capacity,
      freeIndices: Array.from({ length: capacity }, (_, index) => capacity - index - 1),
      allocations: new Map(),
    };
  }

  allocateIndex(category: VisualInstanceCategory, entityId: string): number | null {
    const state = this.states[category];
    if (!state) {
      return null;
    }

    if (state.allocations.has(entityId)) {
      return state.allocations.get(entityId) ?? null;
    }

    const index = state.freeIndices.pop();
    if (index === undefined) {
      this.telemetry.emit({
        type: 'VFX:Instancing:Fallback',
        category,
        entityId,
        timestamp: Date.now(),
        details: { reason: 'capacity-exhausted' },
      });
      return null;
    }

    state.allocations.set(entityId, index);
    this.telemetry.emit({
      type: 'VFX:Instancing:Alloc',
      category,
      entityId,
      index,
      timestamp: Date.now(),
    });
    return index;
  }

  getIndex(category: VisualInstanceCategory, entityId: string): number | null {
    const state = this.states[category];
    if (!state) {
      return null;
    }
    return state.allocations.get(entityId) ?? null;
  }

  releaseIndex(category: VisualInstanceCategory, entityId: string): void {
    const state = this.states[category];
    if (!state) {
      return;
    }

    const index = state.allocations.get(entityId);
    if (index === undefined) {
      return;
    }

    state.allocations.delete(entityId);
    state.freeIndices.push(index);
    this.telemetry.emit({
      type: 'VFX:Instancing:Release',
      category,
      entityId,
      index,
      timestamp: Date.now(),
    });
  }

  getCapacity(category: VisualInstanceCategory): number {
    return this.states[category]?.capacity ?? 0;
  }

  reset(): void {
    (Object.keys(this.states) as VisualInstanceCategory[]).forEach((category) => {
      const state = this.states[category];
      state.allocations.clear();
      state.freeIndices = Array.from({ length: state.capacity }, (_, index) => state.capacity - index - 1);
    });
  }
}

export function createVisualInstanceManager(
  config: VisualInstanceManagerConfig,
  telemetry: VisualInstanceTelemetryEmitter = createVisualTelemetryEmitter(),
): VisualInstanceManager {
  return new VisualInstanceManager(config, telemetry);
}
