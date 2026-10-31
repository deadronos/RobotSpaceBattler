import type { NavigationMesh } from "../types";
import {
  createPathfindingEngine,
  type PathfindingEngine,
} from "../worker/pathfindingEngine";
import type {
  WorkerInbound,
  WorkerOutbound,
  WorkerPathRequest,
  WorkerPathResult,
} from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";

export type WorkerLike = Pick<
  Worker,
  "postMessage" | "terminate" | "addEventListener"
>;

export interface PathWorkerManagerOptions {
  /** Returns a worker, or null when Workers are unsupported. */
  createWorker?: () => WorkerLike | null;
  /** How long to wait for init_ok before falling back. Default 5000. */
  initTimeoutMs?: number;
}

type RunResult =
  | { ok: true; value: WorkerPathResult }
  | { ok: false; error: unknown };

interface PendingEntry {
  req: WorkerPathRequest;
  resolve: (result: RunResult) => void;
}

function defaultCreateWorker(): WorkerLike | null {
  return typeof Worker === "undefined"
    ? null
    : new Worker(new URL("../worker/pathfinding.worker.ts", import.meta.url), {
        type: "module",
        name: "pathfinding",
      });
}

/**
 * Owns the pathfinding Worker. Any worker failure switches, once and
 * permanently, to running the same engine on the main thread.
 */
export class PathWorkerManager {
  private readonly createWorker: () => WorkerLike | null;
  private readonly initTimeoutMs: number;

  private worker: WorkerLike | null = null;
  private workerStarted = false;
  private currentMode: "worker" | "main-thread" = "worker";
  private seq = 0;
  private lastInitMesh: NavigationMesh | null = null;
  private pending = new Map<number, PendingEntry>();
  private initWaiters = new Map<number, () => void>();
  private initTimer: ReturnType<typeof setTimeout> | null = null;

  private mainEngine: PathfindingEngine | null = null;
  private mainEngineMesh: NavigationMesh | null = null;

  constructor(
    private navMeshResource: NavMeshResource,
    options: PathWorkerManagerOptions = {},
  ) {
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.initTimeoutMs = options.initTimeoutMs ?? 5000;
  }

  get mode(): "worker" | "main-thread" {
    return this.currentMode;
  }

  /** Starts worker init if the mesh is valid. Never throws. */
  async ensureInitialized(): Promise<void> {
    try {
      if (!this.isValidMesh() || !this.startWorker()) return;
      const mesh = this.navMeshResource.getSerializedMesh();
      if (mesh === this.lastInitMesh) return;
      const seq = this.postInit(mesh);
      await new Promise<void>((resolve) => this.initWaiters.set(seq, resolve));
    } catch {
      // never throws
    }
  }

  runWorker(req: WorkerPathRequest): Promise<RunResult> {
    if (this.currentMode === "main-thread" || !this.startWorker()) {
      return Promise.resolve(this.runOnMainThread(req));
    }
    return new Promise<RunResult>((resolve) => {
      const mesh = this.navMeshResource.getSerializedMesh();
      if (mesh !== this.lastInitMesh) this.postInit(mesh);
      const seq = ++this.seq;
      this.pending.set(seq, { req, resolve });
      this.post({ type: "path", seq, request: req });
    });
  }

  isValidMesh(): boolean {
    try {
      const mesh = this.navMeshResource.getSerializedMesh();
      const polygons = (mesh as { polygons?: unknown }).polygons;
      return Array.isArray(polygons) && polygons.length > 0;
    } catch {
      return false;
    }
  }

  /** Terminates the worker silently; pending requests finish on the main thread. */
  dispose(): void {
    this.switchToMainThread(null);
  }

  /** Lazily creates the worker. Returns false when in main-thread mode. */
  private startWorker(): boolean {
    if (this.currentMode === "main-thread") return false;
    if (this.workerStarted) return true;
    this.workerStarted = true;
    let worker: WorkerLike | null;
    try {
      worker = this.createWorker();
    } catch (err) {
      this.switchToMainThread(err);
      return false;
    }
    if (!worker) {
      this.switchToMainThread(null);
      return false;
    }
    this.worker = worker;
    worker.addEventListener("message", (e) =>
      this.onMessage((e as MessageEvent<WorkerOutbound>).data),
    );
    worker.addEventListener("error", (e) =>
      this.switchToMainThread((e as ErrorEvent).message || "worker error"),
    );
    worker.addEventListener("messageerror", () =>
      this.switchToMainThread("worker messageerror"),
    );
    return true;
  }

  private post(msg: WorkerInbound): void {
    try {
      this.worker?.postMessage(msg);
    } catch (err) {
      this.switchToMainThread(err);
    }
  }

  private postInit(mesh: NavigationMesh): number {
    const seq = ++this.seq;
    this.lastInitMesh = mesh;
    this.initWaiters.set(seq, () => {});
    if (this.initTimer === null) {
      this.initTimer = setTimeout(
        () => this.switchToMainThread("init timeout"),
        this.initTimeoutMs,
      );
    }
    this.post({ type: "init", seq, mesh });
    return seq;
  }

  private settleInit(seq: number): void {
    const waiter = this.initWaiters.get(seq);
    this.initWaiters.delete(seq);
    waiter?.();
    if (this.initWaiters.size === 0 && this.initTimer !== null) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
  }

  private onMessage(msg: WorkerOutbound): void {
    if (this.currentMode === "main-thread" || !msg) return;
    switch (msg.type) {
      case "init_ok":
        this.settleInit(msg.seq);
        break;
      case "init_error":
        this.switchToMainThread(msg.error);
        break;
      case "path_result": {
        const entry = this.pending.get(msg.seq);
        if (!entry) return;
        this.pending.delete(msg.seq);
        entry.resolve({ ok: true, value: msg.result });
        break;
      }
    }
  }

  /** One-way switch. A non-null reason logs the single warning. */
  private switchToMainThread(reason: unknown): void {
    if (this.currentMode === "main-thread") return;
    this.currentMode = "main-thread";
    this.workerStarted = true;

    if (this.initTimer !== null) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
    const worker = this.worker;
    this.worker = null;
    try {
      worker?.terminate();
    } catch {
      // ignore terminate failures
    }
    if (reason !== null) {
      console.warn(
        "[pathfinding] Worker unavailable; using main-thread pathfinding:",
        reason,
      );
    }

    const pending = [...this.pending.values()];
    this.pending.clear();
    for (const entry of pending) {
      entry.resolve(this.runOnMainThread(entry.req));
    }
    const waiters = [...this.initWaiters.values()];
    this.initWaiters.clear();
    for (const waiter of waiters) waiter();
  }

  private runOnMainThread(req: WorkerPathRequest): RunResult {
    try {
      const mesh = this.navMeshResource.getSerializedMesh();
      if (!this.mainEngine || this.mainEngineMesh !== mesh) {
        this.mainEngine = createPathfindingEngine(mesh);
        this.mainEngineMesh = mesh;
      }
      return { ok: true, value: this.mainEngine.calculatePath(req) };
    } catch (error) {
      return { ok: false, error };
    }
  }
}
