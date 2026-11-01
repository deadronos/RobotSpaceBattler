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
  telemetry?: TelemetryPort;
}

export interface PathfindingTelemetryEvent {
  type:
    | "path-calculation-start"
    | "path-calculation-complete"
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
 * ECS system that calculates and manages navigation paths for robots
 * Includes caching, throttling, and frame budget enforcement
 */
export class PathfindingSystem {
  private calculator: PathCalculator;
  private maxRequestsPerTick: number;
  private telemetry: PathfindingTelemetry;

  constructor(
    private navMeshResource: NavMeshResource,
    options?: PathfindingSystemOptions,
  ) {
    this.maxRequestsPerTick = options?.maxRequestsPerTick ?? 8;
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

  onTelemetry(callback: PathfindingTelemetryCallback): void {
    this.telemetry.on(callback);
  }

  /**
   * Backwards-compatible helper: calculate a single path synchronously (returns a Promise)
   */
  calculatePath(
    start: Point3D,
    pathComponent: PathComponent,
    robotId?: string,
  ): Promise<void> {
    return this.calculator.calculate(start, pathComponent, robotId);
  }

  /**
   * Dispatches path requests for robots that need one.
   *
   * @param robotsWithPaths - Robots to inspect.
   * @param simTimeMs - Current simulation time in ms (drives request
   *   throttling and result timestamps; no wall-clock is read).
   */
  execute(
    robotsWithPaths: Array<{
      pathComponent: PathComponent;
      position: Point3D;
      id?: string;
    }>,
    simTimeMs = 0,
  ): void {
    this.setSimTime(simTimeMs);
    let dispatched = 0;

    for (const robot of robotsWithPaths) {
      if (dispatched >= this.maxRequestsPerTick) break;

      if (
        (robot.pathComponent.status === "pending" ||
          robot.pathComponent.status === "failed") &&
        robot.pathComponent.requestedTarget
      ) {
        dispatched += 1;
        void this.calculator.calculate(
          robot.position,
          robot.pathComponent,
          robot.id,
        );
      }
    }
  }
}
