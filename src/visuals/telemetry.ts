import type { VisualInstanceTelemetryEmitter, VisualInstanceTelemetryEvent } from './VisualInstanceManager';

const GLOBAL_KEY = '__rendererStats';
const TELEMETRY_KEY = 'instancingTelemetry';

interface RendererStatsGlobal {
  drawCalls?: number;
  triangles?: number;
  lines?: number;
  points?: number;
  geometries?: number;
  textures?: number;
  frameTimeMs?: number;
  [TELEMETRY_KEY]?: VisualInstanceTelemetryEvent[];
}

function getGlobalStats(): RendererStatsGlobal | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = (window as Record<string, unknown>)[GLOBAL_KEY];
  if (existing && typeof existing === 'object') {
    return existing as RendererStatsGlobal;
  }

  const stats: RendererStatsGlobal = {
    drawCalls: 0,
    triangles: 0,
    lines: 0,
    points: 0,
    geometries: 0,
    textures: 0,
    frameTimeMs: 0,
    [TELEMETRY_KEY]: [],
  };
  (window as Record<string, unknown>)[GLOBAL_KEY] = stats;
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

  if (!stats[TELEMETRY_KEY]) {
    stats[TELEMETRY_KEY] = [];
  }

  const events = stats[TELEMETRY_KEY]!;
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
