import { useMemo } from "react";

import { useSimulationStore } from "../../state/simulationStore";

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "16px 24px",
  borderRadius: "18px",
  background:
    "linear-gradient(180deg, rgba(17, 25, 52, 0.9) 0%, rgba(7, 10, 22, 0.9) 100%)",
  border: "1px solid rgba(108, 139, 255, 0.25)",
  boxShadow: "0 20px 40px rgba(6, 10, 30, 0.4)",
};

const badgeStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: "14px",
  background: "rgba(68, 104, 255, 0.16)",
  color: "#96b0ff",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: "12px",
};

const timerStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 600,
  color: "#f5f7ff",
};

const subtextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#b5c5ff",
};

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

function StatusPanel() {
  const elapsedMs = useSimulationStore((state) => state.elapsedMs);
  const phase = useSimulationStore((state) => state.phase);
  const qualityProfile = useSimulationStore((state) => state.qualityProfile);

  const phaseBadge = useMemo(() => {
    if (phase === "paused") {
      return "Paused";
    }

    if (phase === "victory") {
      return "Match Complete";
    }

    return "Battle in Progress";
  }, [phase]);

  return (
    <div style={containerStyle}>
      <div style={badgeStyle}>{phaseBadge}</div>
      <div>
        <div style={timerStyle}>{formatTime(elapsedMs)}</div>
        <div style={subtextStyle}>Quality profile: {qualityProfile}</div>
      </div>
    </div>
  );
}

export default StatusPanel;
