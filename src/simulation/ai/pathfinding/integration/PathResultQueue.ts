import type { PendingRequest } from "./PathResultHandler";
import type { PathRunResult } from "./PathWorkerManager";

/** Fixed number of sim ticks between dispatching a path request and applying it. */
export const DEFAULT_PATH_RESULT_LATENCY_TICKS = 3;

/** Deterministic scheduling keys reserved when a request is dispatched. */
export interface PathRequestSlot {
  /** Dispatch order across all requests; breaks ties deterministically. */
  order: number;
  /** Sim tick the request was dispatched on. */
  requestTick: number;
  /** Sim tick at or after which the result may be applied. */
  applyAtTick: number;
}

/**
 * A worker result waiting to be applied at a deterministic simulation tick.
 */
export interface QueuedPathResult extends PathRequestSlot {
  /** Request id the result belongs to (matches `PendingRequest`). */
  requestId: string;
  /** The request that produced the result. */
  request: PendingRequest;
  /** Worker outcome: path, no-path, or an error. */
  outcome: PathRunResult;
}

/**
 * Buffers async path results so they are applied inside `runner.step()` at a
 * deterministic tick instead of whenever the worker promise happens to settle.
 *
 * Results are released on the first sim tick at or after `applyAtTick`
 * (request tick + a fixed latency), always in request order. That keeps two
 * matches with the same seed identical even when the worker resolves at
 * different wall-clock moments.
 */
export class PathResultQueue {
  private entries: QueuedPathResult[] = [];
  private currentTick = 0;
  private seq = 0;

  constructor(
    private readonly latencyTicks: number = DEFAULT_PATH_RESULT_LATENCY_TICKS,
  ) {}

  get size(): number {
    return this.entries.length;
  }

  /** Current simulation tick used to schedule result application. */
  get tick(): number {
    return this.currentTick;
  }

  setTick(tick: number): void {
    this.currentTick = tick;
  }

  /** Reserves the ordering keys for a request dispatched on the current tick. */
  reserveSlot(): PathRequestSlot {
    this.seq += 1;
    return {
      order: this.seq,
      requestTick: this.currentTick,
      applyAtTick: this.currentTick + this.latencyTicks,
    };
  }

  enqueue(
    requestId: string,
    request: PendingRequest,
    slot: PathRequestSlot,
    outcome: PathRunResult,
  ): void {
    this.entries.push({ requestId, request, ...slot, outcome });
  }

  clear(): void {
    this.entries.length = 0;
    this.seq = 0;
  }

  /**
   * Removes and returns the results that are due at `tick`, in request order.
   *
   * @param tick - Current simulation tick.
   * @param applyAll - Release every buffered result regardless of its due
   *   tick (reserved for the synchronous single-path helper).
   */
  drain(tick: number, applyAll = false): QueuedPathResult[] {
    if (this.entries.length === 0) return [];

    const due: QueuedPathResult[] = [];
    const waiting: QueuedPathResult[] = [];
    for (const entry of this.entries) {
      if (applyAll || entry.applyAtTick <= tick) due.push(entry);
      else waiting.push(entry);
    }
    this.entries = waiting;

    due.sort((a, b) => a.order - b.order || a.requestTick - b.requestTick);
    return due;
  }
}
