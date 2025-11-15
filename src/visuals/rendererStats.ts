import type { WebGLRenderer } from 'three';

const GLOBAL_KEY = '__rendererStats';

export interface RendererStatsSnapshot {
  drawCalls: number;
  triangles: number;
  lines: number;
  points: number;
  geometries: number;
  textures: number;
  frameTimeMs: number;
}

const defaultSnapshot: RendererStatsSnapshot = {
  drawCalls: 0,
  triangles: 0,
  lines: 0,
  points: 0,
  geometries: 0,
  textures: 0,
  frameTimeMs: 0,
};

function ensureGlobalSnapshot(): RendererStatsSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const existing = (window as Record<string, unknown>)[GLOBAL_KEY];
  if (existing && typeof existing === 'object') {
    return existing as RendererStatsSnapshot;
  }

  const snapshot = { ...defaultSnapshot } satisfies RendererStatsSnapshot;
  (window as Record<string, unknown>)[GLOBAL_KEY] = snapshot;
  return snapshot;
}

export function initializeRendererStats(renderer: WebGLRenderer): void {
  const snapshot = ensureGlobalSnapshot();
  if (!snapshot) {
    return;
  }

  renderer.info.autoReset = false;
}

export function recordRendererFrame(renderer: WebGLRenderer, delta: number): void {
  const snapshot = ensureGlobalSnapshot();
  if (!snapshot) {
    return;
  }

  const { info } = renderer;
  snapshot.drawCalls = info.render.calls;
  snapshot.triangles = info.render.triangles;
  snapshot.lines = info.render.lines;
  snapshot.points = info.render.points;
  snapshot.geometries = info.memory.geometries;
  snapshot.textures = info.memory.textures;
  snapshot.frameTimeMs = Math.round(delta * 1000 * 1000) / 1000;

  info.reset();
}
