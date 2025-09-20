import React from "react";

import { useScoreStore } from "../../store/scoreStore";

const containerStyle: React.CSSProperties = {
  position: "absolute",
  top: 16,
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: 16,
  padding: "8px 16px",
  background: "rgba(18, 24, 36, 0.85)",
  color: "#fff",
  borderRadius: 8,
  fontSize: 14,
  letterSpacing: 0.5,
  fontFamily: "Roboto, sans-serif",
  pointerEvents: "none",
};

const entryStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  textTransform: "uppercase",
};

const valueStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 18,
};

export default function ScoreBoard() {
  const scores = useScoreStore((state) => state.scores);

  return (
    <div style={containerStyle} id="scoreboard">
      <div style={entryStyle} data-team="red">
        <span>Red</span>
        <span
          style={{ ...valueStyle, color: "#f87171" }}
          data-testid="score-red"
        >
          {scores.red ?? 0}
        </span>
      </div>
      <div style={entryStyle} data-team="blue">
        <span>Blue</span>
        <span
          style={{ ...valueStyle, color: "#60a5fa" }}
          data-testid="score-blue"
        >
          {scores.blue ?? 0}
        </span>
      </div>
    </div>
  );
}
