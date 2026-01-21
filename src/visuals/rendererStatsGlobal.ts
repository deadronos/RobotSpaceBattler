import type { RendererStatsSnapshot } from "./rendererStats";

export const RENDERER_STATS_GLOBAL_KEY = "__rendererStats";

type RendererStatsWindow<T extends RendererStatsSnapshot> = Window & {
  [RENDERER_STATS_GLOBAL_KEY]?: T;
};

export function getRendererStatsGlobal<T extends RendererStatsSnapshot>(
  initializer: () => T,
): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const statsWindow = window as RendererStatsWindow<T>;
  const existing = statsWindow[RENDERER_STATS_GLOBAL_KEY];
  if (existing && typeof existing === "object") {
    return existing;
  }

  const snapshot = initializer();
  statsWindow[RENDERER_STATS_GLOBAL_KEY] = snapshot;
  return snapshot;
}
