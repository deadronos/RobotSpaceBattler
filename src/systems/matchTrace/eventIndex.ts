/**
 * Event Index — Efficient Event Lookup by Timestamp
 *
 * Provides O(1) lookup of events by timestamp and fast timestamp queries.
 * Extracted from MatchPlayer for modularity (T063).
 *
 * Responsibilities:
 * - Build and maintain index of events by timestamp
 * - Query events at specific timestamps
 * - Find frame indices corresponding to timestamps
 * - Provide max timestamp for range validation
 */

import type { MatchTraceEvent } from "./types";

/**
 * EventIndex provides efficient event lookup by timestamp.
 * Multiple events can occur at the same timestamp (ordered by sequenceId).
 */
export class EventIndex {
  private eventsByTimestamp: Map<number, MatchTraceEvent[]> = new Map();
  private events: MatchTraceEvent[];

  /**
   * Initialize index from trace events.
   * @param events - Array of trace events to index
   */
  constructor(events: MatchTraceEvent[]) {
    this.events = events;
    this.buildIndex();
  }

  /**
   * Build efficient lookup map of events by timestamp.
   * Multiple events at same timestamp use sequenceId for ordering.
   */
  private buildIndex(): void {
    this.eventsByTimestamp.clear();
    for (const event of this.events) {
      const ts = event.timestampMs;
      if (!this.eventsByTimestamp.has(ts)) {
        this.eventsByTimestamp.set(ts, []);
      }
      this.eventsByTimestamp.get(ts)!.push(event);
    }
  }

  /**
   * Get all events at exact timestamp (for triggering).
   * @param timestampMs - Target timestamp
   * @returns Array of events at this timestamp, empty if none
   */
  public getEventsAtTimestamp(timestampMs: number): MatchTraceEvent[] {
    return this.eventsByTimestamp.get(timestampMs) || [];
  }

  /**
   * Find event array index for a given timestamp.
   * Returns index of last event at or before the timestamp.
   * @param timestampMs - Target timestamp
   * @returns Event index (0 to events.length - 1)
   */
  public findFrameIndexAtTimestamp(timestampMs: number): number {
    let index = 0;
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].timestampMs <= timestampMs) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  /**
   * Get maximum (final) timestamp in event sequence.
   * @returns Last event's timestamp, 0 if no events
   */
  public getMaxTimestamp(): number {
    if (this.events.length === 0) {
      return 0;
    }
    return this.events[this.events.length - 1].timestampMs;
  }

  /**
   * Get total event count.
   * @returns Number of events in trace
   */
  public getEventCount(): number {
    return this.events.length;
  }

  /**
   * Get all events (for iteration).
   * @returns Reference to events array
   */
  public getAllEvents(): MatchTraceEvent[] {
    return this.events;
  }

  /**
   * Get all events at or before a given timestamp.
   * Useful for reconstructing entity state at a point in time.
   * @param timestampMs - Maximum timestamp (inclusive)
   * @returns Array of events up to and including timestamp
   */
  public getEventsBefore(timestampMs: number): MatchTraceEvent[] {
    const result: MatchTraceEvent[] = [];
    for (const event of this.events) {
      if (event.timestampMs <= timestampMs) {
        result.push(event);
      } else {
        break; // Events are chronologically ordered
      }
    }
    return result;
  }

  /**
   * Rebuild index (useful if events change).
   * Called internally on construction; rarely needed after.
   */
  public rebuildIndex(): void {
    this.buildIndex();
  }
}
