import type { RendererStatsSnapshot } from './rendererStats';
import type { VisualInstanceTelemetryEmitter, VisualInstanceTelemetryEvent } from './VisualInstanceManager';

const GLOBAL_KEY = '__rendererStats';

interface RendererStatsGlobal extends RendererStatsSnapshot {
  instancingTelemetry?: VisualInstanceTelemetryEvent[];
}

type RendererStatsWindow = Window & {
  [GLOBAL_KEY]?: RendererStatsGlobal;
};

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

export function createVisualTelemetryEmitter(): VisualInstanceTelemetryEmitter {
  return {
    emit: (event: VisualInstanceTelemetryEvent) => {
      pushVisualTelemetryEvent(event);
      if (typeof console !== 'undefined' && console.debug) {
        console.debug(`[${event.type}]`, event);
      }
    },
  };
}

export type { VisualInstanceTelemetryEvent };
