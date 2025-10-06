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
        style={{ position: "absolute", bottom: "1rem", right: "1rem" }}
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
      style={{
        position: "absolute",
        bottom: "1rem",
        right: "1rem",
        padding: "1rem",
        background: "rgba(15, 23, 42, 0.88)",
        color: "white",
        borderRadius: "0.75rem",
        minWidth: "220px",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div>
        <strong>{Math.round(stats.currentFPS)} fps</strong>
        <div style={{ opacity: 0.75 }}>
          Avg: {Math.round(stats.averageFPS)} fps
        </div>
      </div>

      {stats.qualityScalingActive ? (
        <div style={{ color: "#f97316", fontWeight: 600 }}>
          Performance mode active
        </div>
      ) : null}

      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
