import type {
  InstancingMaxInstancesConfig,
  PostprocessingQualityLevel,
  QualitySettings,
} from "./QualityManager";

export type PerformanceTier = "low" | "medium" | "high";

export interface QualityEnvironment {
  prefersReducedMotion: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

const DEFAULT_INSTANCING_MAX: InstancingMaxInstancesConfig = {
  bullets: 256,
  rockets: 64,
  lasers: 64,
  effects: 256,
};

function parseBooleanFlag(value: string | null): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return true;
  }
  if (normalized === "0" || normalized === "false") {
    return false;
  }
  return undefined;
}

function readBooleanFlag(
  queryParams: string[],
  envKeys: string[],
): boolean | undefined {
  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      for (const param of queryParams) {
        if (!url.searchParams.has(param)) {
          continue;
        }
        const parsed = parseBooleanFlag(url.searchParams.get(param));
        if (parsed !== undefined) {
          return parsed;
        }
      }
    } catch {
      // Ignore malformed URLs and rely on env defaults.
    }
  }

  const viteEnv = (import.meta as unknown as { env?: Record<string, string> })
    .env;
  for (const key of envKeys) {
    const parsed = parseBooleanFlag(viteEnv?.[key] ?? null);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  if (typeof process !== "undefined" && process.env) {
    for (const key of envKeys) {
      const parsed = parseBooleanFlag(process.env[key] ?? null);
      if (parsed !== undefined) {
        return parsed;
      }
    }
  }

  return undefined;
}

function readQualityEnvironment(): QualityEnvironment {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const deviceMemory =
    typeof navigator !== "undefined" &&
    "deviceMemory" in navigator &&
    typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory ===
      "number"
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;
  const hardwareConcurrency =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : undefined;

  return {
    prefersReducedMotion: Boolean(prefersReducedMotion),
    deviceMemory,
    hardwareConcurrency,
  };
}

export function detectPerformanceTier(
  env: QualityEnvironment,
): PerformanceTier {
  if (env.prefersReducedMotion) {
    return "low";
  }

  const lowMemory = env.deviceMemory !== undefined && env.deviceMemory <= 4;
  const lowCores =
    env.hardwareConcurrency !== undefined && env.hardwareConcurrency <= 4;
  if (lowMemory || lowCores) {
    return "low";
  }

  const highMemory = env.deviceMemory !== undefined && env.deviceMemory >= 8;
  const highCores =
    env.hardwareConcurrency !== undefined && env.hardwareConcurrency >= 8;
  if (highMemory || highCores) {
    return "high";
  }

  return "medium";
}

export function buildQualitySettings({
  perfTier,
  instancingEnabled,
  postprocessingEnabled,
  shadowsEnabled,
}: {
  perfTier: PerformanceTier;
  instancingEnabled?: boolean;
  postprocessingEnabled?: boolean;
  shadowsEnabled?: boolean;
}): QualitySettings {
  const postprocessingQuality: PostprocessingQualityLevel =
    perfTier === "high" ? "high" : "low";
  const dpr = perfTier === "high" ? 1.5 : perfTier === "medium" ? 1.25 : 1;
  const shadowMapSize = perfTier === "high" ? 1024 : 512;
  const resolvedPostprocessing =
    postprocessingEnabled ?? perfTier !== "low";
  const resolvedShadows = shadowsEnabled ?? perfTier !== "low";

  return {
    visuals: {
      instancing: {
        enabled: instancingEnabled ?? true,
        maxInstances: { ...DEFAULT_INSTANCING_MAX },
      },
      obstacles: {
        visualsEnabled: true,
      },
      postprocessing: {
        enabled: resolvedPostprocessing,
        quality: postprocessingQuality,
      },
      render: {
        dpr,
        shadowsEnabled: resolvedShadows,
        shadowMapSize,
      },
    },
  };
}

export function createDefaultQualitySettings(): QualitySettings {
  const perfTier = detectPerformanceTier(readQualityEnvironment());
  const instancingOverride = readBooleanFlag(
    ["instancing"],
    ["VITE_REACT_APP_VFX_INSTANCING", "REACT_APP_VFX_INSTANCING"],
  );
  const postprocessingOverride = readBooleanFlag(
    ["postfx", "postprocessing"],
    ["VITE_REACT_APP_POSTFX", "REACT_APP_POSTFX"],
  );
  const shadowsOverride = readBooleanFlag(
    ["shadows"],
    ["VITE_REACT_APP_SHADOWS", "REACT_APP_SHADOWS"],
  );

  return buildQualitySettings({
    perfTier,
    instancingEnabled: instancingOverride,
    postprocessingEnabled: postprocessingOverride,
    shadowsEnabled: shadowsOverride,
  });
}
