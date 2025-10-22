/**
 * MatchCinematic Component — Victory Cinematic Stub (T022, US1)
 *
 * React component for displaying victory/draw/timeout cinematics.
 * Stub implementation for Phase 3 MVP - full cinematics deferred to Phase 4+.
 *
 * Input: Match outcome and winner info
 * Output: Full-screen cinematic overlay
 */

import React from "react";

import type { MatchOutcome } from "../../systems/matchTrace/matchValidator";
import styles from "./MatchCinematic.module.css";

// ============================================================================
// Component Props
// ============================================================================

export interface MatchCinematicProps {
  /** Match outcome status */
  outcome: MatchOutcome | null;
  /** Winning team ID (if applicable) */
  winnerId?: string;
  /** Message to display */
  message?: string;
  /** Callback when cinematic ends or is skipped */
  onComplete?: () => void;
}

// ============================================================================
// MatchCinematic Component
// ============================================================================

export const MatchCinematic: React.FC<MatchCinematicProps> = ({
  outcome,
  winnerId,
  message,
  onComplete,
}) => {
  if (!outcome || outcome === "in-progress") {
    return null;
  }

  const handleSkip = () => {
    onComplete?.();
  };

  return (
    <div className={styles.cinematicContainer}>
      {/* Full-screen backdrop */}
      <div className={`${styles.backdrop} ${styles[`backdrop-${outcome}`]}`} />

      {/* Cinematic content */}
      <div className={styles.content}>
        <div className={`${styles.titleText} ${styles[`title-${outcome}`]}`}>
          {outcome === "victory" && `${winnerId || "Team"} WINS!`}
          {outcome === "draw" && "DRAW"}
          {outcome === "timeout" && "TIME'S UP"}
        </div>

        {message && <div className={styles.message}>{message}</div>}

        {/* Skip button */}
        <button className={styles.skipButton} onClick={handleSkip}>
          Press SPACE or Click to Continue
        </button>
      </div>

      {/* Stub: Particle effects would go here */}
      {outcome === "victory" && <div className={styles.victoryParticles} />}
    </div>
  );
};

MatchCinematic.displayName = "MatchCinematic";
