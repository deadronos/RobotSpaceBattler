import React, { useEffect, useRef } from "react";

import { useFollowCameraOverlay } from "../../hooks/useFollowCameraOverlay";
import type { UiAdapter } from "../../systems/uiAdapter";

export interface RobotOverlayProps {
  adapter: UiAdapter;
  robotId: string;
}

/**
 * RobotOverlay displays detailed status information for a specific robot.
 * Shows health, status flags, and captain indicator.
 * Visibility controlled by camera mode and user preferences.
 */
export function RobotOverlay({
  adapter,
  robotId,
}: RobotOverlayProps): React.ReactElement | null {
  const { robot, uiState, shouldShow } = useFollowCameraOverlay({
    adapter,
    robotId,
  });
  const healthFillRef = useRef<HTMLDivElement>(null);

  const healthPercent = robot?.maxHealth
    ? Math.round((robot.currentHealth / robot.maxHealth) * 100)
    : 100;

  // ARIA attributes for progressbar - using spread to satisfy jsx-a11y linter
  const progressbarProps = {
    role: "progressbar",
    "aria-label": "Health",
    "aria-valuenow": healthPercent,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
  } as const;

  // Update health fill width via ref to avoid inline style lint errors
  useEffect(() => {
    if (robot && healthFillRef.current) {
      healthFillRef.current.style.setProperty(
        "--health-percent",
        `${healthPercent}%`,
      );
    }
  }, [healthPercent, robot]);

  // Don't render if robot doesn't exist
  if (!robot) {
    return null;
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      data-testid="robot-overlay"
      className={`robot-overlay robot-overlay--team-${robot.team}`}
      role="region"
      aria-label={`Robot ${robot.name || robot.id} status`}
    >
      <div className="robot-overlay__header">
        {robot.name && (
          <h3 className="robot-overlay__name">
            {robot.name}
            {robot.isCaptain && (
              <span
                data-testid="captain-indicator"
                className="robot-overlay__captain-badge"
                aria-label="Team captain"
              >
                ★
              </span>
            )}
          </h3>
        )}
        <span className="robot-overlay__team" aria-label={`Team ${robot.team}`}>
          Team {robot.team}
        </span>
      </div>

      <div className="robot-overlay__health" data-testid="robot-health">
        <div className="robot-overlay__health-bar" {...progressbarProps}>
          <div ref={healthFillRef} className="robot-overlay__health-fill" />
        </div>
        <span className="robot-overlay__health-text">
          {robot.currentHealth} / {robot.maxHealth || "?"}
        </span>
      </div>

      {!uiState.userPreferences.minimalUi && robot.statusFlags.length > 0 && (
        <div
          className="robot-overlay__status"
          data-testid="robot-status-detailed"
        >
          {robot.statusFlags.map((flag) => (
            <span
              key={flag}
              className={`robot-overlay__status-flag robot-overlay__status-flag--${flag}`}
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
