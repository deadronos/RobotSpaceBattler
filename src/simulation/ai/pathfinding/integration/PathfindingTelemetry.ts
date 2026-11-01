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

    // Forward to TelemetryPort. Requests that are only starting are not
    // outcomes, so they are not recorded (counting them as failures made every
    // success rate look like a 50% failure rate).
    if (
      this.telemetryPort?.recordPathfinding &&
      event.type !== "path-calculation-start"
    ) {
      const type =
        event.type === "path-calculation-complete"
          ? event.fromCache
            ? "cache_hit"
            : "calculation"
          : event.type === "path-calculation-no-path"
            ? "no_path"
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
