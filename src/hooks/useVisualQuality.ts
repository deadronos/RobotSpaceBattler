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

import { useCallback, useMemo, useState } from 'react';

import type { VisualQualityLevel, VisualQualityProfile } from '../systems/matchTrace/types';
import {
  createQualityProfile,
  DEFAULT_QUALITY_LEVEL,
  isValidQualityLevel,
} from '../systems/matchTrace/visualQualityProfile';

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
  // Initialize from localStorage if available, otherwise use default
  const [qualityLevel, setQualityLevelState] = useState<VisualQualityLevel>(() => {
    try {
      const stored = localStorage.getItem('visual-quality-level');
      if (stored && isValidQualityLevel(stored)) {
        return stored as VisualQualityLevel;
      }
    } catch {
      // localStorage not available, continue
    }
    return DEFAULT_QUALITY_LEVEL;
  });

  // Create profile from current level (memoized to prevent unnecessary re-renders)
  const qualityProfile = useMemo(
    () => createQualityProfile(qualityLevel),
    [qualityLevel],
  );

  // Wrapped setter that also persists to localStorage
  const setQualityLevel = useCallback((level: VisualQualityLevel) => {
    if (!isValidQualityLevel(level)) {
      console.warn(`[useVisualQuality] Invalid quality level: ${level}`);
      return;
    }

    setQualityLevelState(level);

    // Persist to localStorage
    try {
      localStorage.setItem('visual-quality-level', level);
    } catch {
      // localStorage not available, continue without persisting
    }
  }, []);

  // Simple getter for current level
  const getQualityLevel = useCallback((): VisualQualityLevel => qualityLevel, [
    qualityLevel,
  ]);

  // Simple getter for current profile
  const getQualityProfile = useCallback((): VisualQualityProfile => qualityProfile, [
    qualityProfile,
  ]);

  return {
    qualityLevel,
    qualityProfile,
    setQualityLevel,
    getQualityLevel,
    getQualityProfile,
  };
}
