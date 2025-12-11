import { createVisualTelemetryEmitter } from "./telemetry";

/**
 * Category of visual instances managed by the system.
 */
export type VisualInstanceCategory =
  | "bullets"
  | "rockets"
  | "lasers"
  | "effects";

/**
 * Configuration for the visual instance manager.
 */
export interface VisualInstanceManagerConfig {
  /** Maximum number of instances per category. */
  maxInstances: Record<VisualInstanceCategory, number>;
}

/**
 * Event types for visual instancing telemetry.
 */
export type VisualInstanceTelemetryEventType =
  | "VFX:Instancing:Alloc"
  | "VFX:Instancing:Release"
  | "VFX:Instancing:Fallback";

/**
 * Telemetry event for visual instancing.
 */
export interface VisualInstanceTelemetryEvent {
  type: VisualInstanceTelemetryEventType;
  category: VisualInstanceCategory;
  entityId: string;
  index?: number;
  timestamp: number;
  details?: Record<string, unknown>;
}

/**
 * Emitter interface for visual telemetry events.
 */
export interface VisualInstanceTelemetryEmitter {
  emit: (event: VisualInstanceTelemetryEvent) => void;
}

interface InstanceState {
  freeIndices: number[];
  allocations: Map<string, number>;
  capacity: number;
}

/**
 * Manages allocation of instance indices for instanced rendering.
 * Tracks usage and provides telemetry.
 */
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
      freeIndices: Array.from(
        { length: capacity },
        (_, index) => capacity - index - 1,
      ),
      allocations: new Map(),
    };
  }

  /**
   * Allocates an instance index for an entity.
   * @param category - The category of visual effect.
   * @param entityId - The ID of the entity.
   * @returns The allocated index, or null if capacity is exhausted.
   */
  allocateIndex(
    category: VisualInstanceCategory,
    entityId: string,
  ): number | null {
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
        type: "VFX:Instancing:Fallback",
        category,
        entityId,
        timestamp: Date.now(),
        details: { reason: "capacity-exhausted" },
      });
      return null;
    }

    state.allocations.set(entityId, index);
    this.telemetry.emit({
      type: "VFX:Instancing:Alloc",
      category,
      entityId,
      index,
      timestamp: Date.now(),
    });
    return index;
  }

  /**
   * Gets the allocated index for an entity.
   * @param category - The category.
   * @param entityId - The entity ID.
   * @returns The index or null if not allocated.
   */
  getIndex(category: VisualInstanceCategory, entityId: string): number | null {
    const state = this.states[category];
    if (!state) {
      return null;
    }
    return state.allocations.get(entityId) ?? null;
  }

  /**
   * Releases an allocated index, making it available for reuse.
   * @param category - The category.
   * @param entityId - The entity ID.
   */
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
      type: "VFX:Instancing:Release",
      category,
      entityId,
      index,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets the total capacity for a category.
   * @param category - The category.
   * @returns The maximum number of instances.
   */
  getCapacity(category: VisualInstanceCategory): number {
    return this.states[category]?.capacity ?? 0;
  }

  /**
   * Resets all allocations (e.g., when resetting the match).
   */
  reset(): void {
    (Object.keys(this.states) as VisualInstanceCategory[]).forEach(
      (category) => {
        const state = this.states[category];
        state.allocations.clear();
        state.freeIndices = Array.from(
          { length: state.capacity },
          (_, index) => state.capacity - index - 1,
        );
      },
    );
  }
}

/**
 * Factory function to create a VisualInstanceManager.
 * @param config - Configuration.
 * @param telemetry - Optional telemetry emitter.
 * @returns A VisualInstanceManager instance.
 */
export function createVisualInstanceManager(
  config: VisualInstanceManagerConfig,
  telemetry: VisualInstanceTelemetryEmitter = createVisualTelemetryEmitter(),
): VisualInstanceManager {
  return new VisualInstanceManager(config, telemetry);
}
