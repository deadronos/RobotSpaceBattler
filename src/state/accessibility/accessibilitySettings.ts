import { useCallback, useEffect, useState } from "react";

import { readStoredBoolean, writeStoredBoolean } from "../../lib/storedBoolean";

/**
 * Accessibility display preferences (#166).
 *
 * These are rendering-only preferences. They are persisted in localStorage and
 * never enter the ECS, so the simulation stays deterministic per seed.
 */
export interface AccessibilitySettings {
  /** Fewer effects and no camera inertia; defaults to the OS preference. */
  reducedMotion: boolean;
  /** Swap the team palette for a colour-blind-safe pair. */
  colorBlindPalette: boolean;
}

export const ACCESSIBILITY_STORAGE_KEYS = {
  reducedMotion: "a11y.reducedMotion",
  colorBlindPalette: "a11y.colorBlindPalette",
} as const;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** The OS-level `prefers-reduced-motion` preference (false when unavailable). */
export function systemPrefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  try {
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * Reads the stored overrides. The first visit inherits the OS reduced-motion
 * preference; after that an explicit stored choice wins, so a user can opt back
 * in to motion even when the OS asks for less.
 */
export function readAccessibilitySettings(): AccessibilitySettings {
  return {
    reducedMotion: readStoredBoolean(
      ACCESSIBILITY_STORAGE_KEYS.reducedMotion,
      systemPrefersReducedMotion(),
    ),
    colorBlindPalette: readStoredBoolean(
      ACCESSIBILITY_STORAGE_KEYS.colorBlindPalette,
      false,
    ),
  };
}

export function writeAccessibilitySettings(
  settings: AccessibilitySettings,
): void {
  writeStoredBoolean(
    ACCESSIBILITY_STORAGE_KEYS.reducedMotion,
    settings.reducedMotion,
  );
  writeStoredBoolean(
    ACCESSIBILITY_STORAGE_KEYS.colorBlindPalette,
    settings.colorBlindPalette,
  );
}

export interface AccessibilitySettingsController {
  accessibility: AccessibilitySettings;
  updateAccessibility: (patch: Partial<AccessibilitySettings>) => void;
}

/** App-level state for the accessibility preferences, persisted on change. */
export function useAccessibilitySettings(): AccessibilitySettingsController {
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(
    readAccessibilitySettings,
  );

  useEffect(() => {
    writeAccessibilitySettings(accessibility);
  }, [accessibility]);

  const updateAccessibility = useCallback(
    (patch: Partial<AccessibilitySettings>) => {
      setAccessibility((previous) => ({ ...previous, ...patch }));
    },
    [],
  );

  return { accessibility, updateAccessibility };
}
