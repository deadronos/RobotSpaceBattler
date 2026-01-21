import type { WebGLRenderer } from "three";

import { getRendererStatsGlobal } from "./rendererStatsGlobal";

/**
 * Snapshot of renderer performance statistics.
 */
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

export function createRendererStatsSnapshot(): RendererStatsSnapshot {
  return { ...defaultSnapshot };
}

function ensureGlobalSnapshot(): RendererStatsSnapshot | null {
  return getRendererStatsGlobal(createRendererStatsSnapshot);
}

/**
 * Initializes the renderer statistics collection.
 * Sets up the renderer to preserve frame info for reading.
 *
 * @param renderer - The Three.js WebGLRenderer.
 */
export function initializeRendererStats(renderer: WebGLRenderer): void {
  const snapshot = ensureGlobalSnapshot();
  if (!snapshot) {
    return;
  }

  renderer.info.autoReset = false;
}

/**
 * Records the statistics for the current frame.
 * Should be called at the end of the render loop.
 *
 * @param renderer - The Three.js WebGLRenderer.
 * @param delta - The time elapsed for this frame in seconds.
 */
export function recordRendererFrame(
  renderer: WebGLRenderer,
  delta: number,
): void {
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
