import "./PerformanceOverlay.css";

import type { ChangeEvent } from "react";

import { useUIStore } from "../../store/uiStore";
import type { PerformanceStats } from "../../types";

export interface PerformanceOverlayProps {
  stats: PerformanceStats;
  autoScalingEnabled: boolean;
  onToggleAutoScaling: (enabled: boolean) => void;
}

export function PerformanceOverlay({
  stats,
  autoScalingEnabled,
  onToggleAutoScaling,
}: PerformanceOverlayProps) {
  const visible = useUIStore((state) => state.performanceOverlayVisible);
  const setVisible = useUIStore((state) => state.setPerformanceOverlayVisible);

  if (!visible) {
    return (
      <div
        aria-label="Performance Overlay"
        className="performance-overlay"
        data-state="hidden"
      >
        <button type="button" onClick={() => setVisible(true)}>
          Show Overlay
        </button>
      </div>
    );
  }

  const handleCheckbox = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleAutoScaling(event.target.checked);
  };

  return (
    <aside
      aria-label="Performance Overlay"
      className="performance-overlay performance-overlay--open"
    >
      <div>
        <strong>{Math.round(stats.currentFPS)} fps</strong>
        <div className="performance-overlay__average">
          Avg: {Math.round(stats.averageFPS)} fps
        </div>
      </div>

      {stats.qualityScalingActive ? (
        <div className="performance-overlay__alert">
          Performance mode active
        </div>
      ) : null}

      <label className="performance-overlay__switch">
        <input
          type="checkbox"
          checked={autoScalingEnabled}
          onChange={handleCheckbox}
        />
        Auto quality scaling
      </label>

      <button type="button" onClick={() => setVisible(false)}>
        Hide Overlay
      </button>
    </aside>
  );
}

export default PerformanceOverlay;
