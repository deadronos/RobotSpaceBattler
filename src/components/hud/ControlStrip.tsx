import { useMemo, useState } from "react";

import type {
  BattleHudControls,
  BattleHudPerformanceInfo,
  BattleHudStatusInfo,
} from "../../hooks/useBattleHudData";
import { useVisualQuality } from "../../hooks/useVisualQuality";
import { useUiStore } from "../../store/uiStore";
import { VisualQualityLevel } from "../../systems/matchTrace/types";

export interface ControlStripProps {
  status: BattleHudStatusInfo;
  controls: BattleHudControls;
  performance: BattleHudPerformanceInfo;
  cinematicEnabled?: boolean;
  onTogglePause?: (paused: boolean) => void;
  onToggleCinematic?: (enabled: boolean) => void;
}

function useOverlayDisabled(): boolean {
  return useUiStore((state) => state.statsOpen || state.settingsOpen);
}

export function ControlStrip({
  status,
  controls,
  performance,
  cinematicEnabled,
  onTogglePause,
  onToggleCinematic,
}: ControlStripProps) {
  const overlaysActive = useOverlayDisabled();
  const [internalCinematic, setInternalCinematic] = useState(false);
  const cinematicActive = cinematicEnabled ?? internalCinematic;
  const { qualityLevel, setQualityLevel } = useVisualQuality();
  const qualityOptions = useMemo(
    () => [
      { label: "High", level: VisualQualityLevel.High },
      { label: "Medium", level: VisualQualityLevel.Medium },
      { label: "Low", level: VisualQualityLevel.Low },
    ],
    [],
  );
  const pauseLabel =
    status.status === "paused" ? "Resume Battle" : "Pause Battle";
  const cinematicLabel = cinematicActive
    ? "Disable Cinematic"
    : "Enable Cinematic";
  const hudLabel = controls.isHudVisible ? "Hide HUD" : "Show HUD";

  const handlePauseClick = () => {
    const nextPaused = status.status !== "paused";
    onTogglePause?.(nextPaused);
  };

  const handleCinematicClick = () => {
    const nextEnabled = !cinematicActive;
    if (cinematicEnabled === undefined) {
      setInternalCinematic(nextEnabled);
    }
    onToggleCinematic?.(nextEnabled);
  };

  const handleSettingsClick = () => {
    if (!overlaysActive) {
      controls.openSettings();
    }
  };

  const handleQualityClick = (level: VisualQualityLevel) => {
    if (overlaysActive) {
      return;
    }
    setQualityLevel(level);
  };

  return (
    <div className="control-strip" role="toolbar" aria-label="Battle controls">
      <div className="control-strip__metrics" aria-live="polite">
        <span
          className="control-strip__metric control-strip__metric--fps"
          data-testid="fps-readout"
        >
          {Math.round(performance.fps)} fps
        </span>
        {performance.qualityScalingActive ? (
          <span
            className="control-strip__metric control-strip__metric--scaling"
            role="status"
          >
            Performance scaling active
          </span>
        ) : null}
      </div>

      <div className="control-strip__actions">
        <button
          type="button"
          className="control-strip__button control-strip__button--pause"
          onClick={handlePauseClick}
          disabled={overlaysActive}
        >
          {pauseLabel}
        </button>

        <button
          type="button"
          className="control-strip__button control-strip__button--cinematic"
          onClick={handleCinematicClick}
          disabled={overlaysActive}
        >
          {cinematicLabel}
        </button>

        <button
          type="button"
          className="control-strip__button control-strip__button--hud"
          onClick={controls.toggleHud}
        >
          {hudLabel}
        </button>

        <button
          type="button"
          className="control-strip__button control-strip__button--settings"
          onClick={handleSettingsClick}
          disabled={overlaysActive}
        >
          Settings
        </button>
      </div>

      <div
        className="control-strip__quality"
        role="group"
        aria-label="Visual quality"
      >
        {qualityOptions.map((option) => (
          <button
            type="button"
            key={option.level}
            className={`control-strip__button control-strip__button--quality${
              qualityLevel === option.level
                ? " control-strip__button--quality-active"
                : ""
            }`}
            onClick={() => handleQualityClick(option.level)}
            disabled={overlaysActive}
            aria-pressed={qualityLevel === option.level}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ControlStrip;
