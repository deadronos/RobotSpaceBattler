import { PathCache } from "../search/PathCache";
import type { Point3D } from "../types";
import type { WorkerPathRequest } from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";
import type { PathComponent } from "./PathComponent";
import type { PathfindingTelemetryCallback } from "./PathfindingTelemetry";
import { PathResultHandler, type PendingRequest } from "./PathResultHandler";
import { PathResultQueue } from "./PathResultQueue";
import { PathWorkerManager, type PathRunResult } from "./PathWorkerManager";

export interface PathCalculatorOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number;
  enableNearestFallback?: boolean;
  timeoutMs?: number;
  /**
   * `"worker"` (default) runs requests on the pathfinding worker;
   * `"inline"` computes them synchronously on the calling thread.
   */
  executionMode?: "worker" | "inline";
  /** Fixed latency, in sim ticks, before a result may be applied. */
  resultLatencyTicks?: number;
}

/**
 * Orchestrates path calculation requests, managing caching, throttling, and worker execution.
 * Delegates worker management to PathWorkerManager and result handling to PathResultHandler.
 */
export class PathCalculator {
  private cache?: PathCache;
  private throttleInterval: number;
  private enableSmoothing: boolean;
  private enableNearestFallback: boolean;
  private lastCalculationTimes: Map<string, number> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private telemetryCallbacks: PathfindingTelemetryCallback[] = [];
  /** Latest simulation time (ms); the only clock used for throttling/timestamps. */
  private simTimeMs = 0;
  private resultQueue: PathResultQueue;
  private executionMode: "worker" | "inline";

  private workerManager: PathWorkerManager;
  private resultHandler: PathResultHandler;

  constructor(
    private navMeshResource: NavMeshResource,
    options?: PathCalculatorOptions,
  ) {
    this.enableSmoothing = options?.enableSmoothing ?? true;
    this.throttleInterval = options?.throttleInterval ?? 333;
    this.enableNearestFallback = options?.enableNearestFallback ?? true;
    this.executionMode = options?.executionMode ?? "worker";
    this.resultQueue = new PathResultQueue(options?.resultLatencyTicks);

    if (options?.enableCaching ?? true) {
      this.cache = new PathCache({
        maxSize: options?.maxCacheSize ?? 100,
        now: () => this.simTimeMs,
      });
    }

    // Initialize worker and result handler
    this.workerManager = new PathWorkerManager(navMeshResource);
    this.resultHandler = new PathResultHandler(
      navMeshResource,
      this.telemetryCallbacks,
      this.cache,
      () => this.simTimeMs,
    );

    // Worker initialization is lazy: workers will be initialized on demand if a worker
    // reports it is uninitialized. Avoid eager init in constructor to keep tests simple.
  }

  /**
   * Try to initialize the worker only if the serialized mesh looks valid.
   * This avoids initializing with empty test doubles in unit tests.
   */
  async ensureInitialized() {
    if (this.executionMode === "inline") return;
    await this.workerManager.ensureInitialized();
  }

  /**
   * Sets the current simulation time. Path requests, throttling, cache LRU
   * ordering and result timestamps all use this clock instead of wall-clock
   * time so the simulation stays deterministic.
   */
  setSimTime(nowMs: number): void {
    this.simTimeMs = nowMs;
  }

  /** Sets the current simulation tick used to schedule result application. */
  setSimTick(tick: number): void {
    this.resultQueue.setTick(tick);
  }

  /** Number of worker results buffered for a future tick (diagnostics). */
  get queuedResultCount(): number {
    return this.resultQueue.size;
  }

  /**
   * Applies buffered worker results whose tick has arrived, in request order.
   *
   * This is the only place async path results mutate path components, so every
   * effect of pathfinding happens inside a fixed sim step at a reproducible
   * tick.
   *
   * @param tick - Current simulation tick.
   * @param applyAll - Apply every buffered result now, ignoring its due tick
   *   (reserved for the synchronous single-path helper).
   * @returns How many results were applied.
   */
  applyPendingResults(
    tick: number = this.resultQueue.tick,
    applyAll = false,
  ): number {
    let applied = 0;
    for (const entry of this.resultQueue.drain(tick, applyAll)) {
      if (this.resultHandler.applyQueuedResult(entry, this.pendingRequests)) {
        applied += 1;
      }
    }
    return applied;
  }

  /** Applies every buffered result now (synchronous single-path helper). */
  flushPendingResults(): number {
    return this.applyPendingResults(this.resultQueue.tick, true);
  }

  /** Clears per-match async state (buffered results, requests, throttles). */
  reset(): void {
    this.resultQueue.clear();
    this.pendingRequests.clear();
    this.lastCalculationTimes.clear();
  }

  dispose(): void {
    this.workerManager.dispose();
  }

  onTelemetry(cb: PathfindingTelemetryCallback) {
    this.telemetryCallbacks.push(cb);
  }

  /**
   * Worker execution method - kept as a separate method on PathCalculator
   * so tests can stub/monkeypatch this for testing purposes.
   */
  protected async runWorker(req: WorkerPathRequest): Promise<PathRunResult> {
    return this.workerManager.runWorker(req);
  }

  private emitTelemetry(event: Parameters<PathfindingTelemetryCallback>[0]) {
    for (const cb of this.telemetryCallbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error("Telemetry callback error:", err);
      }
    }
  }

  /**
   * Calculate a path from start to the requested target on the pathComponent.
   * Uses caching and request throttling to optimize performance.
   */
  async calculate(
    start: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ) {
    const target = pathComponent.requestedTarget;
    if (!target) return;

    // Check cache first (check before mesh validation so unit tests can verify cache behavior)
    if (this.cache) {
      const cached = this.cache.get(start, target);
      if (cached) {
        this.resultHandler.handleCacheHit(cached, pathComponent, robotId);
        return;
      }
    }

    // Validate mesh has polygons before dispatching to worker
    // (Skip this check if runWorker has been monkeypatched for testing)
    if (
      this.runWorker ===
      (PathCalculator.prototype as unknown as { runWorker: unknown }).runWorker
    ) {
      if (!this.workerManager.isValidMesh()) {
        pathComponent.status = "failed" as const;
        pathComponent.path = null;

        this.emitTelemetry({
          type: "path-calculation-failed",
          entityId: robotId,
          timestamp: this.simTimeMs,
          success: false,
          durationMs: 0,
          error: "NavMesh has no polygons",
        });

        return;
      }
    }

    // Apply throttling for repeated requests from same robot
    if (robotId) {
      const last = this.lastCalculationTimes.get(robotId);
      const now = this.simTimeMs;
      if (last !== undefined && now - last < this.throttleInterval) return;
      this.lastCalculationTimes.set(robotId, now);
    }

    // Dispatch to worker
    await this.dispatchRequest(start, target, pathComponent, robotId);
  }

  /**
   * Sends a request to the worker (or computes it inline) and buffers the result
   * for a later, deterministic tick.
   */
  private async dispatchRequest(
    start: Point3D,
    target: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ): Promise<void> {
    pathComponent.status = "calculating" as const;

    const slot = this.resultQueue.reserveSlot();
    const requestId = robotId ?? `path-request-${slot.order}`;
    const startTime = this.simTimeMs;

    const request: PendingRequest = {
      pathComponent,
      startTime,
      robotId,
      start,
      target,
    };
    this.pendingRequests.set(requestId, request);

    this.emitTelemetry({
      type: "path-calculation-start",
      entityId: robotId,
      timestamp: this.simTimeMs,
      from: start,
      to: target,
    });

    const req: WorkerPathRequest = {
      type: "path_request",
      id: requestId,
      start,
      target,
      enableSmoothing: this.enableSmoothing,
      enableNearestFallback: this.enableNearestFallback,
    };
    if (this.executionMode === "inline") {
      const outcome = this.workerManager.runInline(req);
      this.resultQueue.enqueue(requestId, request, slot, outcome);
      return;
    }

    let pending: Promise<PathRunResult>;
    try {
      pending = this.runWorker(req);
    } catch (error) {
      this.resultQueue.enqueue(requestId, request, slot, { ok: false, error });
      return;
    }

    try {
      this.resultQueue.enqueue(requestId, request, slot, await pending);
    } catch (error) {
      this.resultQueue.enqueue(requestId, request, slot, { ok: false, error });
    }
  }
}
