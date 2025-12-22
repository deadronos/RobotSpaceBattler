import { useSyncExternalStore } from "react";

import { createDefaultQualitySettings } from "./qualityDefaults";

/**
 * Configuration for maximum instance counts per visual category.
 */
export interface InstancingMaxInstancesConfig {
  bullets: number;
  rockets: number;
  lasers: number;
  effects: number;
}

/**
 * Configuration for instancing quality settings.
 */
export interface InstancingQualityConfig {
  enabled: boolean;
  maxInstances: InstancingMaxInstancesConfig;
}

export type PostprocessingQualityLevel = "low" | "high";

export interface PostprocessingQualityConfig {
  enabled: boolean;
  quality: PostprocessingQualityLevel;
}

export interface RenderQualityConfig {
  dpr: number;
  shadowsEnabled: boolean;
  shadowMapSize: number;
}

export interface ObstacleDebugConfig {
  visualsEnabled: boolean;
}

/**
 * Global quality settings structure.
 */
export interface QualitySettings {
  visuals: {
    instancing: InstancingQualityConfig;
    obstacles: ObstacleDebugConfig;
    postprocessing: PostprocessingQualityConfig;
    render: RenderQualityConfig;
  };
}

type QualityOverrides = {
  visuals?: {
    instancing?: {
      enabled?: boolean;
      maxInstances?: Partial<InstancingMaxInstancesConfig>;
    };
    obstacles?: Partial<ObstacleDebugConfig>;
    postprocessing?: Partial<PostprocessingQualityConfig>;
    render?: Partial<RenderQualityConfig>;
  };
};

type QualityListener = () => void;

const DEFAULT_SETTINGS: QualitySettings = createDefaultQualitySettings();

function cloneSettings(settings: QualitySettings): QualitySettings {
  return {
    visuals: {
      instancing: {
        enabled: settings.visuals.instancing.enabled,
        maxInstances: { ...settings.visuals.instancing.maxInstances },
      },
      obstacles: { ...settings.visuals.obstacles },
      postprocessing: { ...settings.visuals.postprocessing },
      render: { ...settings.visuals.render },
    },
  };
}

/**
 * Manages application-wide quality settings (e.g., graphics fidelity).
 * Allows subscribing to changes and persists settings.
 */
export class QualityManager {
  private settings: QualitySettings;
  private readonly listeners = new Set<QualityListener>();

  constructor(initial?: QualityOverrides) {
    this.settings = initial
      ? this.mergeSettings(DEFAULT_SETTINGS, initial)
      : cloneSettings(DEFAULT_SETTINGS);
  }

  private mergeSettings(
    base: QualitySettings,
    overrides: QualityOverrides,
  ): QualitySettings {
    const instancing = overrides.visuals?.instancing;
    const maxInstanceOverrides = instancing?.maxInstances ?? {};
    const obstacles = overrides.visuals?.obstacles ?? {};
    const postprocessing = overrides.visuals?.postprocessing ?? {};
    const render = overrides.visuals?.render ?? {};

    return {
      visuals: {
        instancing: {
          enabled: instancing?.enabled ?? base.visuals.instancing.enabled,
          maxInstances: {
            bullets:
              maxInstanceOverrides.bullets ??
              base.visuals.instancing.maxInstances.bullets,
            rockets:
              maxInstanceOverrides.rockets ??
              base.visuals.instancing.maxInstances.rockets,
            lasers:
              maxInstanceOverrides.lasers ??
              base.visuals.instancing.maxInstances.lasers,
            effects:
              maxInstanceOverrides.effects ??
              base.visuals.instancing.maxInstances.effects,
          },
        },
        obstacles: {
          visualsEnabled:
            obstacles.visualsEnabled ?? base.visuals.obstacles.visualsEnabled,
        },
        postprocessing: {
          enabled:
            postprocessing.enabled ?? base.visuals.postprocessing.enabled,
          quality:
            postprocessing.quality ?? base.visuals.postprocessing.quality,
        },
        render: {
          dpr: render.dpr ?? base.visuals.render.dpr,
          shadowsEnabled:
            render.shadowsEnabled ?? base.visuals.render.shadowsEnabled,
          shadowMapSize:
            render.shadowMapSize ?? base.visuals.render.shadowMapSize,
        },
      },
    };
  }

  /**
   * Gets the current quality settings.
   */
  getSettings(): QualitySettings {
    return this.settings;
  }

  /**
   * Gets the instancing specific configuration.
   */
  getInstancingConfig(): InstancingQualityConfig {
    return this.settings.visuals.instancing;
  }

  /**
   * Enables or disables instancing.
   * @param enabled - True to enable.
   */
  setInstancingEnabled(enabled: boolean): void {
    if (this.settings.visuals.instancing.enabled === enabled) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { instancing: { enabled } },
    });
    this.emit();
  }

  /**
   * Toggles obstacle debug visuals.
   */
  setObstacleVisuals(enabled: boolean): void {
    if (this.settings.visuals.obstacles.visualsEnabled === enabled) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { obstacles: { visualsEnabled: enabled } },
    });
    this.emit();
  }

  /**
   * Updates the maximum instance counts.
   * @param maxInstances - Partial config with new limits.
   */
  updateInstancingMaxInstances(
    maxInstances: Partial<InstancingMaxInstancesConfig>,
  ): void {
    this.settings = this.mergeSettings(this.settings, {
      visuals: {
        instancing: {
          maxInstances,
        },
      },
    });
    this.emit();
  }

  /**
   * Enables or disables postprocessing.
   */
  setPostprocessingEnabled(enabled: boolean): void {
    if (this.settings.visuals.postprocessing.enabled === enabled) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { postprocessing: { enabled } },
    });
    this.emit();
  }

  /**
   * Updates postprocessing quality level.
   */
  setPostprocessingQuality(quality: PostprocessingQualityLevel): void {
    if (this.settings.visuals.postprocessing.quality === quality) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { postprocessing: { quality } },
    });
    this.emit();
  }

  /**
   * Enables or disables scene shadows.
   */
  setShadowsEnabled(enabled: boolean): void {
    if (this.settings.visuals.render.shadowsEnabled === enabled) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { render: { shadowsEnabled: enabled } },
    });
    this.emit();
  }

  /**
   * Updates the rendering device pixel ratio.
   */
  setRenderDpr(dpr: number): void {
    if (!Number.isFinite(dpr)) {
      return;
    }
    const nextDpr = Math.max(0.75, Math.min(2, dpr));
    if (this.settings.visuals.render.dpr === nextDpr) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { render: { dpr: nextDpr } },
    });
    this.emit();
  }

  /**
   * Subscribes to settings changes.
   * @param listener - Callback function.
   * @returns Unsubscribe function.
   */
  subscribe(listener: QualityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const qualityManager = new QualityManager();

type QualityManagerWindow = Window & { __qualityManager?: QualityManager };

if (typeof window !== "undefined") {
  const managerWindow = window as QualityManagerWindow;
  managerWindow.__qualityManager = qualityManager;
}

/**
 * React hook to access quality settings.
 * @returns The current QualitySettings.
 */
export function useQualitySettings(): QualitySettings {
  return useSyncExternalStore(
    (listener) => qualityManager.subscribe(listener),
    () => qualityManager.getSettings(),
    () => qualityManager.getSettings(),
  );
}
