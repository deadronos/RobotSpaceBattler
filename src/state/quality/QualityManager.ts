import { useSyncExternalStore } from 'react';

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
  };
}

type QualityOverrides = {
  visuals?: {
    instancing?: {
      enabled?: boolean;
      maxInstances?: Partial<InstancingMaxInstancesConfig>;
    };
    obstacles?: Partial<ObstacleDebugConfig>;
  };
};

type QualityListener = () => void;

function readBooleanFlag(): boolean {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    if (url.searchParams.has('instancing')) {
      const value = url.searchParams.get('instancing');
      if (value === '1' || value === 'true') {
        return true;
      }
      if (value === '0' || value === 'false') {
        return false;
      }
    }
  }

  const viteEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  const direct = viteEnv?.VITE_REACT_APP_VFX_INSTANCING ?? viteEnv?.REACT_APP_VFX_INSTANCING;
  if (direct !== undefined) {
    return direct === '1' || direct?.toLowerCase() === 'true';
  }

  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env.REACT_APP_VFX_INSTANCING ?? process.env.VITE_REACT_APP_VFX_INSTANCING;
    if (envValue !== undefined) {
      return envValue === '1' || envValue.toLowerCase() === 'true';
    }
  }

  return false;
}

const DEFAULT_SETTINGS: QualitySettings = {
  visuals: {
    instancing: {
      enabled: readBooleanFlag(),
      maxInstances: {
        bullets: 256,
        rockets: 64,
        lasers: 64,
        effects: 256,
      },
    },
    obstacles: {
      visualsEnabled: true,
    },
  },
};

function cloneSettings(settings: QualitySettings): QualitySettings {
  return {
    visuals: {
      instancing: {
        enabled: settings.visuals.instancing.enabled,
        maxInstances: { ...settings.visuals.instancing.maxInstances },
      },
      obstacles: { ...settings.visuals.obstacles },
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
    this.settings = initial ? this.mergeSettings(DEFAULT_SETTINGS, initial) : cloneSettings(DEFAULT_SETTINGS);
  }

  private mergeSettings(base: QualitySettings, overrides: QualityOverrides): QualitySettings {
    const instancing = overrides.visuals?.instancing;
    const maxInstanceOverrides = instancing?.maxInstances ?? {};
    const obstacles = overrides.visuals?.obstacles ?? {};

    return {
      visuals: {
        instancing: {
          enabled: instancing?.enabled ?? base.visuals.instancing.enabled,
          maxInstances: {
            bullets: maxInstanceOverrides.bullets ?? base.visuals.instancing.maxInstances.bullets,
            rockets: maxInstanceOverrides.rockets ?? base.visuals.instancing.maxInstances.rockets,
            lasers: maxInstanceOverrides.lasers ?? base.visuals.instancing.maxInstances.lasers,
            effects: maxInstanceOverrides.effects ?? base.visuals.instancing.maxInstances.effects,
          },
        },
        obstacles: {
          visualsEnabled: obstacles.visualsEnabled ?? base.visuals.obstacles.visualsEnabled,
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
    this.settings = this.mergeSettings(this.settings, { visuals: { obstacles: { visualsEnabled: enabled } } });
    this.emit();
  }

  /**
   * Updates the maximum instance counts.
   * @param maxInstances - Partial config with new limits.
   */
  updateInstancingMaxInstances(maxInstances: Partial<InstancingMaxInstancesConfig>): void {
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

if (typeof window !== 'undefined') {
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
