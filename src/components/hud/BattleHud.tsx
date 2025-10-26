import { useMemo } from "react";

import { TEAM_CONFIGS } from "../../lib/teamConfig";
import { useSimulationStore } from "../../state/simulationStore";
import { useHudStore } from "../../state/ui/hudStore";

const cardStyle: React.CSSProperties = {
  pointerEvents: "auto",
  minWidth: "360px",
  padding: "18px 24px",
  borderRadius: "18px",
  background:
    "linear-gradient(180deg, rgba(25, 36, 74, 0.85) 0%, rgba(9, 12, 28, 0.92) 100%)",
  boxShadow: "0 20px 40px rgba(6, 10, 30, 0.55)",
  border: "1px solid rgba(114, 147, 255, 0.25)",
};

const titleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "8px",
};

const statusStyle: React.CSSProperties = {
  fontSize: "13px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#8aa2ff",
};

const controlsStyle: React.CSSProperties = {
  marginTop: "16px",
  display: "flex",
  gap: "8px",
};

const buttonStyle: React.CSSProperties = {
  pointerEvents: "auto",
  border: "none",
  padding: "10px 16px",
  borderRadius: "12px",
  background: "linear-gradient(180deg, #3d4ff6 0%, #2430c4 100%)",
  color: "#f5f6ff",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 10px 18px rgba(36, 48, 196, 0.45)",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "rgba(37, 53, 113, 0.8)",
  boxShadow: "none",
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

function BattleHud() {
  const phase = useSimulationStore((state) => state.phase);
  const elapsedMs = useSimulationStore((state) => state.elapsedMs);
  const pause = useSimulationStore((state) => state.pause);
  const resume = useSimulationStore((state) => state.resume);
  const toggleHud = useHudStore((state) => state.toggleHud);
  const cameraMode = useHudStore((state) => state.cameraMode);
  const setCameraMode = useHudStore((state) => state.setCameraMode);
  const showHud = useHudStore((state) => state.showHud);
  const winner = useSimulationStore((state) => state.winner);
  const restartTimer = useSimulationStore((state) => state.restartTimer);

  const nextActionLabel = useMemo(() => {
    if (phase === "paused") {
      return "Resume Battle";
    }

    if (phase === "victory") {
      return "Restart Match";
    }

    return "Pause Battle";
  }, [phase]);

  const handlePrimaryClick = () => {
    if (phase === "paused") {
      resume();
    } else if (phase === "victory") {
      useSimulationStore.getState().setRestartTimer(0);
    } else {
      pause();
    }
  };

  const statusText = useMemo(() => {
    if (phase === "victory" && winner) {
      const teamName = TEAM_CONFIGS[winner].name;
      if (restartTimer !== null) {
        return `${teamName} wins — restarting in ${(restartTimer / 1000).toFixed(1)}s`;
      }
      return `${teamName} wins`;
    }

    if (phase === "paused") {
      return "Battle paused";
    }

    return "Battle in progress";
  }, [phase, restartTimer, winner]);

  const cinematicMode = cameraMode === "cinematic";

  const handleCameraToggle = () => {
    setCameraMode(cinematicMode ? "default" : "cinematic");
  };

  return (
    <div style={cardStyle}>
      <div style={statusStyle} id="status">
        {statusText}
      </div>
      <div style={titleStyle}>Space Station Clash</div>
      <div style={{ fontSize: "14px", color: "#c8d4ff" }}>
        Elapsed {formatTime(elapsedMs)}
      </div>
      <div style={controlsStyle}>
        <button type="button" style={buttonStyle} onClick={handlePrimaryClick}>
          {nextActionLabel}
        </button>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={handleCameraToggle}
        >
          {cinematicMode ? "Disable Cinematic" : "Enable Cinematic"}
        </button>
        <button type="button" style={secondaryButtonStyle} onClick={toggleHud}>
          {showHud ? "Hide HUD" : "Show HUD"}
        </button>
      </div>
    </div>
  );
}

export default BattleHud;
