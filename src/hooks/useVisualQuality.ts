/**
 * useVisualQuality Hook — Visual Quality Profile State Management (T028, US2)
 *
 * React hook for managing visual quality profile state throughout match rendering.
 * Provides getters and setters for quality level and profile configuration.
 *
 * Integrates with visualQualityProfile.ts factory to create and manage profiles.
 * Stores preference in React context/state; can optionally persist to localStorage.
 *
 * Usage:
 *   const { qualityLevel, setQualityLevel, qualityProfile } = useVisualQuality();
 *   // Change quality during match
 *   setQualityLevel('high');
 */

import { useCallback, useMemo } from "react";

import { useUiStore } from "../store/uiStore";
import type {
  VisualQualityLevel,
  VisualQualityProfile,
} from "../systems/matchTrace/types";
import {
  createQualityProfile,
  DEFAULT_QUALITY_LEVEL,
  isValidQualityLevel,
} from "../systems/matchTrace/visualQualityProfile";

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseVisualQualityReturn {
  /** Current quality level */
  qualityLevel: VisualQualityLevel;
  /** Current quality profile configuration */
  qualityProfile: VisualQualityProfile;
  /** Set quality level (triggers re-render) */
  setQualityLevel: (level: VisualQualityLevel) => void;
  /** Get quality level */
  getQualityLevel: () => VisualQualityLevel;
  /** Get quality profile */
  getQualityProfile: () => VisualQualityProfile;
}

// ============================================================================
// useVisualQuality Hook
// ============================================================================

/**
 * Hook for managing visual quality profile state.
 *
 * Provides reactive state management for quality level and automatically
 * generates the corresponding profile configuration.
 *
 * @returns Quality state and control functions
 */
export function useVisualQuality(): UseVisualQualityReturn {
  const qualityLevel = useUiStore(
    (state) => state.visualQualityLevel ?? DEFAULT_QUALITY_LEVEL,
  );
  const setQualityLevelState = useUiStore(
    (state) => state.setVisualQualityLevel,
  );

  // Create profile from current level (memoized to prevent unnecessary re-renders)
  const qualityProfile = useMemo(
    () => createQualityProfile(qualityLevel),
    [qualityLevel],
  );

  // Wrapped setter that also persists to localStorage
  const setQualityLevel = useCallback(
    (level: VisualQualityLevel) => {
      if (!isValidQualityLevel(level)) {
        console.warn(`[useVisualQuality] Invalid quality level: ${level}`);
        return;
      }

      setQualityLevelState(level);
    },
    [setQualityLevelState],
  );

  // Simple getter for current level
  const getQualityLevel = useCallback(
    (): VisualQualityLevel => qualityLevel,
    [qualityLevel],
  );

  // Simple getter for current profile
  const getQualityProfile = useCallback(
    (): VisualQualityProfile => qualityProfile,
    [qualityProfile],
  );

  return {
    qualityLevel,
    qualityProfile,
    setQualityLevel,
    getQualityLevel,
    getQualityProfile,
  };
}
