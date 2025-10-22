import { useCallback } from "react";

import {
  QualityProfile,
  useSimulationStore,
} from "../../state/simulationStore";

const containerStyle: React.CSSProperties = {
  pointerEvents: "auto",
  padding: "18px 24px",
  borderRadius: "18px",
  background:
    "linear-gradient(180deg, rgba(20, 30, 66, 0.86) 0%, rgba(6, 9, 20, 0.92) 100%)",
  border: "1px solid rgba(104, 137, 255, 0.3)",
  boxShadow: "0 20px 36px rgba(3, 6, 18, 0.5)",
  minWidth: "420px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#f1f3ff",
  marginBottom: "12px",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "14px",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  color: "#c0ccff",
};

const qualityButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "10px 14px",
  borderRadius: "12px",
  border: active
    ? "1px solid rgba(255, 255, 255, 0.45)"
    : "1px solid rgba(128, 153, 255, 0.3)",
  background: active
    ? "linear-gradient(180deg, #4a68ff 0%, #2b3fe6 100%)"
    : "rgba(41, 57, 111, 0.6)",
  color: active ? "#f6f8ff" : "#c5d2ff",
  cursor: "pointer",
  fontWeight: 600,
  letterSpacing: "0.04em",
});

const toggleStyle: React.CSSProperties = {
  appearance: "none",
  width: "48px",
  height: "24px",
  borderRadius: "12px",
  background: "rgba(54, 76, 150, 0.6)",
  position: "relative",
  cursor: "pointer",
};

const toggleDotStyle = (active: boolean): React.CSSProperties => ({
  position: "absolute",
  top: "3px",
  left: active ? "26px" : "3px",
  width: "18px",
  height: "18px",
  borderRadius: "50%",
  background: active ? "#6ee7ff" : "#a3b6ff",
  transition: "left 0.2s ease",
});

function SettingsPanel() {
  const qualityProfile = useSimulationStore((state) => state.qualityProfile);
  const setQualityProfile = useSimulationStore(
    (state) => state.setQualityProfile,
  );
  const reducedMotion = useSimulationStore((state) => state.reducedMotion);
  const toggleReducedMotion = useSimulationStore(
    (state) => state.toggleReducedMotion,
  );

  const handleQualityChange = useCallback(
    (profile: QualityProfile) => () => {
      setQualityProfile(profile);
    },
    [setQualityProfile],
  );

  return (
    <div style={containerStyle}>
      <div style={titleStyle}>Settings</div>
      <div style={buttonRowStyle}>
        {(["High", "Medium", "Low"] as QualityProfile[]).map((profile) => (
          <button
            key={profile}
            type="button"
            style={qualityButtonStyle(qualityProfile === profile)}
            onClick={handleQualityChange(profile)}
          >
            {profile}
          </button>
        ))}
      </div>
      <div style={toggleRowStyle}>
        <span>Reduced Motion</span>
        <button
          type="button"
          style={toggleStyle}
          onClick={toggleReducedMotion}
          aria-pressed={reducedMotion}
        >
          <span style={toggleDotStyle(reducedMotion)} />
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;
