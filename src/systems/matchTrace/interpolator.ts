/**
 * Interpolator — Entity State Interpolation
 *
 * Reconstructs smooth entity positions and states between recorded events.
 * Uses linear interpolation between consecutive move events and handles
 * visual lag with extrapolation when needed (T012, US1).
 *
 * Responsibilities:
 * - Interpolate entity position between move events
 * - Handle partial frame timing (events may not align with render frame)
 * - Detect entity birth/death transitions
 * - Cache and update interpolation state efficiently
 */

import type { MatchTraceEvent, MoveEvent, Position, SpawnEvent } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface InterpolationState {
  entityId: string;
  lastMoveEvent?: MoveEvent;
  nextMoveEvent?: MoveEvent;
  isAlive: boolean;
  lastSpawnTime?: number;
  lastDeathTime?: number;
}

export interface InterpolatedEntity {
  id: string;
  position: Position;
  visible: boolean;
  interpolationFactor: number; // 0-1, position between last and next move
}

// ============================================================================
// Interpolation Functions
// ============================================================================

/**
 * Build interpolation state from all events before a given timestamp.
 *
 * @param events - All events up to and including current timestamp
 * @param entityId - Entity to interpolate
 * @returns InterpolationState with last/next move events and alive status
 */
export function buildInterpolationState(
  events: MatchTraceEvent[],
  entityId: string,
): InterpolationState {
  let lastMoveEvent: MoveEvent | undefined;
  let isAlive = false;
  let lastSpawnTime: number | undefined;
  let lastDeathTime: number | undefined;

  // Scan events in order
  for (const event of events) {
    // Check if event has entityId property (spawn, move, death)
    const hasEntityId = "entityId" in event;
    if (hasEntityId && (event as { entityId: string }).entityId === entityId) {
      if (event.type === "spawn") {
        const spawnEvent = event as SpawnEvent;
        isAlive = true;
        lastSpawnTime = spawnEvent.timestampMs;
      } else if (event.type === "death") {
        isAlive = false;
        lastDeathTime = event.timestampMs;
      } else if (event.type === "move") {
        lastMoveEvent = event as MoveEvent;
      }
    }
  }

  return {
    entityId,
    lastMoveEvent,
    isAlive,
    lastSpawnTime,
    lastDeathTime,
  };
}

/**
 * Get next move event for an entity after a given timestamp.
 *
 * @param allEvents - All events in trace
 * @param entityId - Entity to find
 * @param afterTimestamp - Minimum timestamp (exclusive)
 * @returns Next MoveEvent, or undefined if none
 */
export function getNextMoveEvent(
  allEvents: MatchTraceEvent[],
  entityId: string,
  afterTimestamp: number,
): MoveEvent | undefined {
  for (const event of allEvents) {
    const hasEntityId = "entityId" in event;
    if (
      hasEntityId &&
      (event as { entityId: string }).entityId === entityId &&
      event.type === "move" &&
      event.timestampMs > afterTimestamp
    ) {
      return event as MoveEvent;
    }
  }
  return undefined;
}

/**
 * Linearly interpolate between two positions.
 *
 * @param from - Start position
 * @param to - End position
 * @param factor - Interpolation factor 0-1 (0=from, 1=to)
 * @returns Interpolated position
 */
export function lerp(from: Position, to: Position, factor: number): Position {
  const t = Math.max(0, Math.min(1, factor)); // Clamp to 0-1
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: from.z + (to.z - from.z) * t,
  };
}

/**
 * Interpolate entity state at a given timestamp.
 *
 * @param allEvents - All events in trace
 * @param eventsBefore - All events up to current timestamp
 * @param entityId - Entity to interpolate
 * @param currentTimestamp - Current trace timestamp (ms)
 * @returns InterpolatedEntity with position and visibility
 */
export function interpolateEntity(
  allEvents: MatchTraceEvent[],
  eventsBefore: MatchTraceEvent[],
  entityId: string,
  currentTimestamp: number,
): InterpolatedEntity {
  const state = buildInterpolationState(eventsBefore, entityId);

  // Entity not yet spawned or dead
  if (!state.isAlive) {
    return {
      id: entityId,
      position: { x: 0, y: 0, z: 0 },
      visible: false,
      interpolationFactor: 0,
    };
  }

  // If no move event yet, use spawn position
  if (!state.lastMoveEvent) {
    const spawnEvent = eventsBefore.find(
      (e) =>
        "entityId" in e &&
        (e as { entityId: string }).entityId === entityId &&
        e.type === "spawn",
    ) as SpawnEvent | undefined;
    if (spawnEvent) {
      return {
        id: entityId,
        position: spawnEvent.position,
        visible: true,
        interpolationFactor: 0,
      };
    }
    return {
      id: entityId,
      position: { x: 0, y: 0, z: 0 },
      visible: false,
      interpolationFactor: 0,
    };
  }

  // Find next move event for interpolation target
  const nextMove = getNextMoveEvent(
    allEvents,
    entityId,
    state.lastMoveEvent.timestampMs,
  );

  if (!nextMove) {
    // No next move, use last position
    return {
      id: entityId,
      position: state.lastMoveEvent.position,
      visible: true,
      interpolationFactor: 1,
    };
  }

  // Interpolate between last and next move events
  const lastTime = state.lastMoveEvent.timestampMs;
  const nextTime = nextMove.timestampMs;
  const timeDelta = nextTime - lastTime;
  const elapsed = currentTimestamp - lastTime;
  const interpolationFactor = timeDelta > 0 ? elapsed / timeDelta : 0;

  const position = lerp(
    state.lastMoveEvent.position,
    nextMove.position,
    interpolationFactor,
  );

  return {
    id: entityId,
    position,
    visible: true,
    interpolationFactor: Math.max(0, Math.min(1, interpolationFactor)),
  };
}

/**
 * Interpolate all entities at a given timestamp.
 *
 * @param allEvents - All events in trace
 * @param eventsBefore - All events up to current timestamp
 * @param currentTimestamp - Current trace timestamp (ms)
 * @param entityIds - List of entity IDs to interpolate (if unknown, derive from events)
 * @returns Map of entityId -> InterpolatedEntity
 */
export function interpolateAllEntities(
  allEvents: MatchTraceEvent[],
  eventsBefore: MatchTraceEvent[],
  currentTimestamp: number,
  entityIds?: string[],
): Map<string, InterpolatedEntity> {
  // Derive entity IDs from events if not provided
  let idsToInterpolate = entityIds;
  if (!idsToInterpolate) {
    const idSet = new Set<string>();
    for (const event of allEvents) {
      if ("entityId" in event) {
        idSet.add((event as { entityId: string }).entityId);
      }
    }
    idsToInterpolate = Array.from(idSet);
  }

  const result = new Map<string, InterpolatedEntity>();
  for (const id of idsToInterpolate) {
    const interpolated = interpolateEntity(
      allEvents,
      eventsBefore,
      id,
      currentTimestamp,
    );
    result.set(id, interpolated);
  }

  return result;
}

/**
 * Calculate interpolation tolerance (±ms for timestamp alignment).
 * Used in FR-009-A and US3 (Deterministic Replay).
 *
 * Tolerance is typically ±16ms (one frame at 60fps).
 */
export const INTERPOLATION_TOLERANCE_MS = 16;
