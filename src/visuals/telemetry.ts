import { createRendererStatsSnapshot, type RendererStatsSnapshot } from "./rendererStats";
import { getRendererStatsGlobal } from "./rendererStatsGlobal";
import type {
  VisualInstanceTelemetryEmitter,
  VisualInstanceTelemetryEvent,
} from "./VisualInstanceManager";

interface RendererStatsGlobal extends RendererStatsSnapshot {
  instancingTelemetry?: VisualInstanceTelemetryEvent[];
}

// Determine once whether debug logs are enabled via URL flag, e.g. /?debuglogs=1
const DEBUG_LOGS_ENABLED = (() => {
  try {
    if (typeof window === "undefined" || !window.location) return false;
    const params = new URLSearchParams(window.location.search || "");
    const v = params.get("debuglogs");
    return v === "1" || v === "true";
  } catch {
    return false;
  }
})();
function getGlobalStats(): RendererStatsGlobal | null {
  const stats = getRendererStatsGlobal(() => ({
    ...createRendererStatsSnapshot(),
    instancingTelemetry: [],
  }));
  if (stats && !stats.instancingTelemetry) {
    stats.instancingTelemetry = [];
  }
  return stats;
}

/**
 * Pushes a telemetry event to the global stats object for debugging/analysis.
 * Maintains a fixed-size buffer of events.
 *
 * @param event - The event to record.
 */
export function pushVisualTelemetryEvent(
  event?: VisualInstanceTelemetryEvent,
): void {
  if (!event) {
    return;
  }
  const stats = getGlobalStats();
  if (!stats) {
    return;
  }

  if (!stats.instancingTelemetry) {
    stats.instancingTelemetry = [];
  }

  const events = stats.instancingTelemetry;
  events.push(event);
  if (events.length > 256) {
    events.splice(0, events.length - 256);
  }
}

/**
 * Creates a telemetry emitter for visual systems.
 *
 * @returns A VisualInstanceTelemetryEmitter.
 */
export function createVisualTelemetryEmitter(): VisualInstanceTelemetryEmitter {
  return {
    emit: (event: VisualInstanceTelemetryEvent) => {
      pushVisualTelemetryEvent(event);
      if (
        DEBUG_LOGS_ENABLED &&
        typeof console !== "undefined" &&
        console.debug
      ) {
        console.debug(`[${event.type}]`, event);
      }
    },
  };
}

export type { VisualInstanceTelemetryEvent };
