import type { TelemetryPort } from "../../../../runtime/simulation/ports";
import type { PathfindingTelemetryEvent } from "./PathfindingSystem";

export type PathfindingTelemetryCallback = (
  event: PathfindingTelemetryEvent,
) => void;

export class PathfindingTelemetry {
  private callbacks: PathfindingTelemetryCallback[] = [];

  constructor(private telemetryPort?: TelemetryPort) {}

  on(callback: PathfindingTelemetryCallback): void {
    this.callbacks.push(callback);
  }

  emit(event: PathfindingTelemetryEvent): void {
    // Forward to internal callbacks
    for (const cb of this.callbacks) {
      try {
        cb(event);
      } catch (err) {
        console.error("PathfindingTelemetry callback error:", err);
      }
    }

    // Forward to TelemetryPort
    if (this.telemetryPort?.recordPathfinding) {
      const type =
        event.type === "path-calculation-complete"
          ? event.fromCache
            ? "cache_hit"
            : "calculation"
          : "failure";

      this.telemetryPort.recordPathfinding({
        type,
        entityId: event.entityId,
        durationMs: event.durationMs ?? 0,
        pathLength: event.pathLength,
        waypointCount: event.waypointCount,
        error: event.error,
      });
    }
  }
}

