import { useState } from 'react';

import type {
  BattleHudControls,
  BattleHudPerformanceInfo,
  BattleHudStatusInfo,
} from '../../hooks/useBattleHudData';
import { useUiStore } from '../../store/uiStore';

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
  const pauseLabel = status.status === 'paused' ? 'Resume Battle' : 'Pause Battle';
  const cinematicLabel = cinematicActive
    ? 'Disable Cinematic'
    : 'Enable Cinematic';
  const hudLabel = controls.isHudVisible ? 'Hide HUD' : 'Show HUD';

  const handlePauseClick = () => {
    const nextPaused = status.status !== 'paused';
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

  return (
    <div className="control-strip" role="toolbar" aria-label="Battle controls">
      <div className="control-strip__metrics" aria-live="polite">
        <span className="control-strip__fps" data-testid="fps-readout">
          {Math.round(performance.fps)} fps
        </span>
        {performance.qualityScalingActive ? (
          <span className="control-strip__scaling" role="status">
            Performance scaling active
          </span>
        ) : null}
      </div>

      <div className="control-strip__actions">
        <button
          type="button"
          onClick={handlePauseClick}
          disabled={overlaysActive}
        >
          {pauseLabel}
        </button>

        <button
          type="button"
          onClick={handleCinematicClick}
          disabled={overlaysActive}
        >
          {cinematicLabel}
        </button>

        <button type="button" onClick={controls.toggleHud}>
          {hudLabel}
        </button>

        <button
          type="button"
          onClick={handleSettingsClick}
          disabled={overlaysActive}
        >
          Settings
        </button>
      </div>
    </div>
  );
}

export default ControlStrip;
