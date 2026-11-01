import type { TelemetryPort } from "../../../../runtime/simulation/ports";
import type { Point3D } from "../types";
import type { NavMeshResource } from "./NavMeshResource";
import { PathCalculator } from "./PathCalculator";
import type { PathComponent } from "./PathComponent";
import { PathfindingTelemetry } from "./PathfindingTelemetry";

// CONSTITUTION-EXEMPT: PathfindingSystem is a complex orchestrator that manages multiple
// concerns (throttling, batching, error recovery, telemetry) in one place for coherence.
// Target refactor: v0.2.0 or split into smaller strategy classes
// Exemption granted: 2026-05-10

interface PathfindingSystemOptions {
  enableSmoothing?: boolean;
  enableCaching?: boolean;
  maxCacheSize?: number;
  throttleInterval?: number; // ms between recalculations per robot
  maxRequestsPerTick?: number; // deterministic cap on path requests dispatched per tick
  enableTimeout?: boolean; // Enable timeout fallback
  timeoutMs?: number; // Timeout threshold (default: 100ms)
  enableNearestFallback?: boolean; // Enable nearest accessible point fallback
  maxWorkers?: number;
  /** `"worker"` (default) or `"inline"` (synchronous, for headless runs). */
  executionMode?: "worker" | "inline";
  /** Sim ticks between dispatching a path request and applying its result. */
  resultLatencyTicks?: number;
  /**
   * Distance in metres a followed path's goal may drift before the path is
   * invalidated and re-requested. Defaults to
   * {@link DEFAULT_TARGET_MOVE_THRESHOLD}.
   */
  targetMoveThreshold?: number;
  telemetry?: TelemetryPort;
}

export interface PathfindingTelemetryEvent {
  type:
    | "path-calculation-start"
    | "path-calculation-complete"
    | "path-calculation-no-path"
    | "path-calculation-failed";
  entityId?: string;
  timestamp: number;
  from?: Point3D;
  to?: Point3D;
  success?: boolean;
  durationMs?: number;
  pathLength?: number;
  waypointCount?: number;
  fromCache?: boolean;
  error?: string;
}

export type PathfindingTelemetryCallback = (
  event: PathfindingTelemetryEvent,
) => void;

/**
 * How far (in metres, XZ) a path's goal may drift from the robot's current
 * requested target before the path is considered stale. Targets are moving
 * robots, so the goal is constantly stale unless a threshold is allowed; 2 m
 * keeps the followed corridor accurate without re-requesting every tick.
 */
export const DEFAULT_TARGET_MOVE_THRESHOLD = 2;

/**
 * ECS system that calculates and manages navigation paths for robots
 * Includes caching, throttling, and frame budget enforcement
 */
export class PathfindingSystem {
  private calculator: PathCalculator;
  private maxRequestsPerTick: number;
  private targetMoveThresholdSq: number;
  private telemetry: PathfindingTelemetry;

  constructor(
    private navMeshResource: NavMeshResource,
    options?: PathfindingSystemOptions,
  ) {
    this.maxRequestsPerTick = options?.maxRequestsPerTick ?? 8;
    const threshold =
      options?.targetMoveThreshold ?? DEFAULT_TARGET_MOVE_THRESHOLD;
    this.targetMoveThresholdSq = threshold * threshold;
    this.telemetry = new PathfindingTelemetry(options?.telemetry);
    this.calculator = new PathCalculator(navMeshResource, options);
    // Forward telemetry: keep the system observable
    this.calculator.onTelemetry((e) => this.telemetry.emit(e));

    // Attempt to initialize worker if mesh is present (non-blocking)
    void this.calculator.ensureInitialized();
  }

  /** Terminates the pathfinding worker. Safe to call more than once. */
  dispose(): void {
    this.calculator.dispose();
  }

  /** Sets the simulation clock used for throttling and timestamps. */
  setSimTime(simTimeMs: number): void {
    this.calculator.setSimTime(simTimeMs);
  }

  /**
   * Applies path results that are due at `tick`, in request order. Called from
   * the fixed-step loop so results never land outside a sim step.
   *
   * @param tick - Current simulation tick (defaults to the last tick set).
   * @returns How many results were applied.
   */
  applyPendingResults(tick?: number): number {
    return this.calculator.applyPendingResults(tick);
  }

  /** Drops buffered results and pending requests (called between matches). */
  reset(): void {
    this.calculator.reset();
  }

  onTelemetry(callback: PathfindingTelemetryCallback): void {
    this.telemetry.on(callback);
  }

  /**
   * Backwards-compatible helper: calculate a single path synchronously (returns a Promise)
   */
  async calculatePath(
    start: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ): Promise<void> {
    await this.calculator.calculate(start, pathComponent, robotId);
    // Synchronous helper: apply the result immediately instead of waiting for
    // the next step. The live loop uses execute() instead.
    this.calculator.flushPendingResults();
  }

  /**
   * Advances pathfinding by one fixed simulation step: applies due worker
   * results at the start of the step (deterministic request order), then
   * invalidates paths whose goal has drifted from the robot's requested
   * target, then dispatches requests for robots that need a path.
   *
   * Invalidation compares the target position the path was calculated for with
   * the robot's current `requestedTarget` (which the AI rewrites whenever the
   * destination changes, including when it switches targets). Only sim state
   * is consulted, so the decision is deterministic.
   *
   * @param robotsWithPaths - Robots to inspect.
   * @param simTimeMs - Current simulation time in ms (drives request
   *   throttling and result timestamps; no wall-clock is read).
   * @param tick - Current simulation tick, used to schedule result application.
   */
  execute(
    robotsWithPaths: Array<{
      pathComponent: PathComponent;
      position: Point3D;
      id?: string;
    }>,
    simTimeMs = 0,
    tick = 0,
  ): void {
    this.setSimTime(simTimeMs);
    this.calculator.setSimTick(tick);
    this.applyPendingResults(tick);
    let dispatched = 0;

    for (const robot of robotsWithPaths) {
      const pathComponent = robot.pathComponent;
      this.invalidateStalePath(pathComponent);

      // `continue` rather than `break`: robots past the per-tick request budget
      // must still have stale paths invalidated so they stop following them.
      if (dispatched >= this.maxRequestsPerTick) continue;

      if (
        (pathComponent.status === "pending" ||
          pathComponent.status === "failed" ||
          pathComponent.status === "invalid") &&
        pathComponent.requestedTarget
      ) {
        dispatched += 1;
        void this.calculator.calculate(robot.position, pathComponent, robot.id);
      }
    }
  }

  /**
   * Clears a path that no longer leads to the robot's requested target.
   *
   * @returns true when the path was invalidated.
   */
  private invalidateStalePath(pathComponent: PathComponent): boolean {
    if (pathComponent.status !== "valid") return false;

    const target = pathComponent.requestedTarget;
    const goal =
      pathComponent.pathGoal ??
      pathComponent.path?.waypoints[pathComponent.path.waypoints.length - 1];

    // No target (the AI dropped it) or no recorded goal means the path cannot
    // be shown to still be useful.
    if (!target || !goal) {
      pathComponent.status = "invalid";
      pathComponent.path = null;
      pathComponent.pathGoal = null;
      pathComponent.currentWaypointIndex = 0;
      return true;
    }

    const dx = target.x - goal.x;
    const dz = target.z - goal.z;
    if (dx * dx + dz * dz <= this.targetMoveThresholdSq) return false;

    pathComponent.status = "invalid";
    pathComponent.path = null;
    pathComponent.pathGoal = null;
    pathComponent.currentWaypointIndex = 0;
    return true;
  }
}
