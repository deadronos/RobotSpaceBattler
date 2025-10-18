/**
 * Entity Mapper — Match Trace to Entity State Converter
 *
 * Transforms MatchTrace events into a canonical entity state model for rendering.
 * Provides efficient entity lifecycle management and snapshot generation (T015, US1).
 *
 * Responsibilities:
 * - Track entity birth/death from spawn/death events
 * - Maintain entity health and status from damage events
 * - Export entity snapshots for rendering
 * - Handle entity cleanup on death
 */

import type {
  DamageEvent,
  DeathEvent,
  MatchTraceEvent,
  MoveEvent,
  SpawnEvent,
  Unit,
} from './types';

// ============================================================================
// Types & State
// ============================================================================

export interface EntityState {
  id: string;
  teamId: string;
  type: 'robot' | 'projectile';
  spawnedAt: number; // timestampMs
  diedAt?: number; // timestampMs if dead
  currentHealth?: number;
  maxHealth?: number;
  isAlive: boolean;
  position: { x: number; y: number; z: number };
  modelRef?: string;
}

export interface EntitySnapshot {
  entities: Map<string, EntityState>;
  timestamp: number;
  frameIndex: number;
}

// ============================================================================
// Entity Mapper Class
// ============================================================================

export class EntityMapper {
  private entities: Map<string, EntityState> = new Map();
  private lastSnapshot: EntitySnapshot | null = null;

  /**
   * Update entity state based on events up to a given timestamp.
   *
   * @param allEvents - All events in the trace
   * @param upToTimestamp - Process events up to this timestamp
   * @param frameIndex - Current frame index for snapshot tracking
   * @returns EntitySnapshot with all entities at this timestamp
   */
  public updateFromEvents(
    allEvents: MatchTraceEvent[],
    upToTimestamp: number,
    frameIndex: number,
  ): EntitySnapshot {
    // Process events in chronological order
    for (const event of allEvents) {
      if (event.timestampMs > upToTimestamp) {
        break;
      }

      this.processEvent(event);
    }

    // Create and cache snapshot
    this.lastSnapshot = {
      entities: new Map(this.entities),
      timestamp: upToTimestamp,
      frameIndex,
    };

    return this.lastSnapshot;
  }

  /**
   * Process a single event to update entity state.
   */
  private processEvent(event: MatchTraceEvent): void {
    switch (event.type) {
      case 'spawn': {
        const spawnEvent = event as SpawnEvent;
        const entity: EntityState = {
          id: spawnEvent.entityId || 'unknown',
          teamId: spawnEvent.teamId || 'unknown',
          type: 'robot',
          spawnedAt: spawnEvent.timestampMs,
          isAlive: true,
          position: spawnEvent.position,
          modelRef: undefined,
        };
        this.entities.set(entity.id, entity);
        break;
      }

      case 'move': {
        const moveEvent = event as MoveEvent;
        const entity = this.entities.get(moveEvent.entityId || 'unknown');
        if (entity) {
          entity.position = moveEvent.position;
        }
        break;
      }

      case 'damage': {
        const damageEvent = event as DamageEvent;
        const entity = this.entities.get(damageEvent.targetId || 'unknown');
        if (entity) {
          entity.currentHealth = damageEvent.resultingHealth;
          entity.maxHealth = entity.maxHealth ?? damageEvent.resultingHealth;
        }
        break;
      }

      case 'death': {
        const deathEvent = event as DeathEvent;
        const entity = this.entities.get(deathEvent.entityId || 'unknown');
        if (entity) {
          entity.isAlive = false;
          entity.diedAt = deathEvent.timestampMs;
        }
        break;
      }

      // Other event types don't change entity state
      case 'move':
      case 'fire':
      case 'hit':
      case 'score':
      default:
        // No-op for rendering purposes
        break;
    }
  }

  /**
   * Get entity by ID.
   */
  public getEntity(id: string): EntityState | undefined {
    return this.entities.get(id);
  }

  /**
   * Get all entities.
   */
  public getAllEntities(): EntityState[] {
    return Array.from(this.entities.values());
  }

  /**
   * Get all alive entities.
   */
  public getAliveEntities(): EntityState[] {
    return Array.from(this.entities.values()).filter((e) => e.isAlive);
  }

  /**
   * Get entities by team ID.
   */
  public getEntitiesByTeam(teamId: string): EntityState[] {
    return Array.from(this.entities.values()).filter((e) => e.teamId === teamId);
  }

  /**
   * Get the last cached snapshot.
   */
  public getLastSnapshot(): EntitySnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Reset mapper (clear all entities).
   */
  public reset(): void {
    this.entities.clear();
    this.lastSnapshot = null;
  }

  /**
   * Get debug information.
   */
  public getDebugInfo(): string {
    const alive = this.getAliveEntities().length;
    const dead = this.getAllEntities().length - alive;
    return `[EntityMapper] Alive: ${alive}, Dead: ${dead}, Total: ${this.getAllEntities().length}`;
  }
}

/**
 * Helper: Create EntityState from Unit data (for simulation integration).
 */
export function entityStateFromUnit(
  unit: Unit,
  spawnedAt: number,
  position: { x: number; y: number; z: number },
): EntityState {
  return {
    id: unit.id,
    teamId: unit.teamId,
    type: 'robot',
    spawnedAt,
    isAlive: true,
    position,
    currentHealth: unit.maxHealth,
    maxHealth: unit.maxHealth,
    modelRef: unit.modelRef,
  };
}

/**
 * Helper: Filter entities for rendering (visible only).
 */
export function filterVisibleEntities(entities: EntityState[]): EntityState[] {
  return entities.filter((e) => e.isAlive);
}
