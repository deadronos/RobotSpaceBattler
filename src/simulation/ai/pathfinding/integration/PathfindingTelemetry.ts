import type { PathfindingTelemetryEvent } from "./PathfindingSystem";

export type PathfindingTelemetryCallback = (
  event: PathfindingTelemetryEvent,
) => void;

export class PathfindingTelemetry {
  private callbacks: PathfindingTelemetryCallback[] = [];

  on(callback: PathfindingTelemetryCallback): void {
    this.callbacks.push(callback);
  }

  emit(event: PathfindingTelemetryEvent): void {
    for (const cb of this.callbacks) {
      try {
        cb(event);
      } catch (err) {
        // Keep telemetry emission resilient
        console.error("PathfindingTelemetry callback error:", err);
      }
    }
  }
}
