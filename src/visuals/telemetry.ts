import type { RendererStatsSnapshot } from './rendererStats';
import type { VisualInstanceTelemetryEmitter, VisualInstanceTelemetryEvent } from './VisualInstanceManager';

const GLOBAL_KEY = '__rendererStats';

interface RendererStatsGlobal extends RendererStatsSnapshot {
  instancingTelemetry?: VisualInstanceTelemetryEvent[];
}

type RendererStatsWindow = Window & {
  [GLOBAL_KEY]?: RendererStatsGlobal;
};

// Determine once whether debug logs are enabled via URL flag, e.g. /?debuglogs=1
const DEBUG_LOGS_ENABLED = (() => {
  try {
    if (typeof window === 'undefined' || !window.location) return false;
    const params = new URLSearchParams(window.location.search || '');
    const v = params.get('debuglogs');
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
})();
function getGlobalStats(): RendererStatsGlobal | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const statsWindow = window as RendererStatsWindow;
  const existing = statsWindow[GLOBAL_KEY];
  if (existing && typeof existing === 'object') {
    if (!existing.instancingTelemetry) {
      existing.instancingTelemetry = [];
    }
    return existing;
  }

  const stats: RendererStatsGlobal = {
    drawCalls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    geometries: 0,
    textures: 0,
    frameTimeMs: 0,
    instancingTelemetry: [],
  };
  statsWindow[GLOBAL_KEY] = stats;
  return stats;
}

/**
 * Pushes a telemetry event to the global stats object for debugging/analysis.
 * Maintains a fixed-size buffer of events.
 *
 * @param event - The event to record.
 */
export function pushVisualTelemetryEvent(event?: VisualInstanceTelemetryEvent): void {
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
      if (DEBUG_LOGS_ENABLED && typeof console !== 'undefined' && console.debug) {
        console.debug(`[${event.type}]`, event);
      }
    },
  };
}

export type { VisualInstanceTelemetryEvent };
