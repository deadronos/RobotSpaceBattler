import { useSyncExternalStore } from 'react';

export interface InstancingMaxInstancesConfig {
  bullets: number;
  rockets: number;
  lasers: number;
  effects: number;
}

export interface InstancingQualityConfig {
  enabled: boolean;
  maxInstances: InstancingMaxInstancesConfig;
}

export interface QualitySettings {
  visuals: {
    instancing: InstancingQualityConfig;
  };
}

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
  },
};

function cloneSettings(settings: QualitySettings): QualitySettings {
  return {
    visuals: {
      instancing: {
        enabled: settings.visuals.instancing.enabled,
        maxInstances: { ...settings.visuals.instancing.maxInstances },
      },
    },
  };
}

export class QualityManager {
  private settings: QualitySettings;
  private readonly listeners = new Set<QualityListener>();

  constructor(initial?: Partial<QualitySettings>) {
    this.settings = initial ? this.mergeSettings(DEFAULT_SETTINGS, initial) : cloneSettings(DEFAULT_SETTINGS);
  }

  private mergeSettings(base: QualitySettings, overrides: Partial<QualitySettings>): QualitySettings {
    return {
      visuals: {
        instancing: {
          enabled: overrides.visuals?.instancing?.enabled ?? base.visuals.instancing.enabled,
          maxInstances: {
            bullets: overrides.visuals?.instancing?.maxInstances?.bullets ?? base.visuals.instancing.maxInstances.bullets,
            rockets: overrides.visuals?.instancing?.maxInstances?.rockets ?? base.visuals.instancing.maxInstances.rockets,
            lasers: overrides.visuals?.instancing?.maxInstances?.lasers ?? base.visuals.instancing.maxInstances.lasers,
            effects: overrides.visuals?.instancing?.maxInstances?.effects ?? base.visuals.instancing.maxInstances.effects,
          },
        },
      },
    };
  }

  getSettings(): QualitySettings {
    return this.settings;
  }

  getInstancingConfig(): InstancingQualityConfig {
    return this.settings.visuals.instancing;
  }

  setInstancingEnabled(enabled: boolean): void {
    if (this.settings.visuals.instancing.enabled === enabled) {
      return;
    }
    this.settings = this.mergeSettings(this.settings, {
      visuals: { instancing: { enabled } },
    });
    this.emit();
  }

  updateInstancingMaxInstances(maxInstances: Partial<InstancingMaxInstancesConfig>): void {
    this.settings = this.mergeSettings(this.settings, {
      visuals: {
        instancing: {
          maxInstances: {
            bullets: maxInstances.bullets,
            rockets: maxInstances.rockets,
            lasers: maxInstances.lasers,
            effects: maxInstances.effects,
          } as InstancingMaxInstancesConfig,
        },
      },
    });
    this.emit();
  }

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

if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).__qualityManager = qualityManager;
}

export function useQualitySettings(): QualitySettings {
  return useSyncExternalStore(
    (listener) => qualityManager.subscribe(listener),
    () => qualityManager.getSettings(),
    () => qualityManager.getSettings(),
  );
}
