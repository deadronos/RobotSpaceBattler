import { move, spawn } from "multithreading";

import { calculatePath, initWorker } from "../worker/pathfinding.worker";
import type { WorkerPathRequest, WorkerPathResult } from "../worker/types";
import type { NavMeshResource } from "./NavMeshResource";

/**
 * Manages worker initialization and execution for pathfinding calculations.
 * Responsible for spawning workers, handling initialization, and executing path requests.
 */
export class PathWorkerManager {
  constructor(private navMeshResource: NavMeshResource) {}

  private isPromiseLike<T>(value: unknown): value is Promise<T> {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as { then?: unknown };
    return typeof candidate.then === "function";
  }

  /**
   * Initialize worker with serialized mesh so worker-level search state can be primed.
   */
  async initializeWorker() {
    try {
      await spawn(move(this.navMeshResource.getSerializedMesh()), initWorker).join();
    } catch (err) {
      console.error("Failed to initialize pathfinding worker:", err);
    }
  }

  /**
   * Try to initialize the worker only if the serialized mesh looks valid.
   * This avoids initializing with empty test doubles in unit tests.
   */
  async ensureInitialized() {
    try {
      const mesh = this.navMeshResource.getSerializedMesh();
      const polygons = (mesh as { polygons?: unknown }).polygons;
      if (Array.isArray(polygons) && polygons.length > 0) {
        await this.initializeWorker();
      }
    } catch (err) {
      console.error("PathWorkerManager ensureInitialized failed:", err);
    }
  }

  /**
   * Execute a path request in the worker.
   * Worker runner kept as internal method so tests can stub this.
   */
  async runWorker(req: WorkerPathRequest): Promise<{ ok: true; value: WorkerPathResult } | { ok: false; error: unknown }> {
    try {
      const task = spawn(move(req), calculatePath);
      return await task.join();
    } catch {
      // Fallback for environments where worker spawn fails (tests / Node without worker support)
      try {
        // Run pathfinding in-process as a graceful fallback
        const value = await calculatePath(req);
        return { ok: true, value };
      } catch (err2) {
        return { ok: false, error: err2 };
      }
    }
  }

  /**
   * Check if the serialized mesh is valid for worker execution.
   */
  isValidMesh(): boolean {
    try {
      const mesh = this.navMeshResource.getSerializedMesh();
      const polygons = (mesh as { polygons?: unknown }).polygons;
      return Array.isArray(polygons) && polygons.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Unwrap worker response which may be nested in a Promise.
   */
  async unwrapWorkerResult(value: WorkerPathResult | Promise<WorkerPathResult>): Promise<WorkerPathResult> {
    return this.isPromiseLike<WorkerPathResult>(value)
      ? await (value as unknown as Promise<WorkerPathResult>)
      : (value as WorkerPathResult);
  }
}
