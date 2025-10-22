import { useCallback, useState } from "react";

import {
  QualityProfile,
  useSimulationStore,
} from "../../state/simulationStore";

const menuButtonStyle: React.CSSProperties = {
  pointerEvents: "auto",
  appearance: "none",
  background: "linear-gradient(180deg, rgba(20, 30, 66, 0.86) 0%, rgba(6, 9, 20, 0.92) 100%)",
  border: "1px solid rgba(104, 137, 255, 0.3)",
  borderRadius: "12px",
  padding: "8px 12px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  transition: "all 0.2s ease",
  color: "#c0ccff",
};

const menuButtonHoverStyle: React.CSSProperties = {
  ...menuButtonStyle,
  borderColor: "rgba(104, 137, 255, 0.6)",
  background: "linear-gradient(180deg, rgba(40, 50, 100, 0.9) 0%, rgba(16, 19, 50, 0.95) 100%)",
};

const panelStyle: React.CSSProperties = {
  pointerEvents: "auto",
  position: "absolute",
  top: "100%",
  right: 0,
  marginTop: "8px",
  padding: "16px",
  borderRadius: "12px",
  background: "linear-gradient(180deg, rgba(20, 30, 66, 0.94) 0%, rgba(6, 9, 20, 0.96) 100%)",
  border: "1px solid rgba(104, 137, 255, 0.4)",
  boxShadow: "0 20px 36px rgba(3, 6, 18, 0.6)",
  minWidth: "240px",
  zIndex: 1000,
};

const titleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#f1f3ff",
  marginBottom: "12px",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "14px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#7e8cd6",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: "8px",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
};

const qualityButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "6px 10px",
  borderRadius: "8px",
  border: active
    ? "1px solid rgba(255, 255, 255, 0.45)"
    : "1px solid rgba(128, 153, 255, 0.2)",
  background: active
    ? "linear-gradient(180deg, #4a68ff 0%, #2b3fe6 100%)"
    : "rgba(41, 57, 111, 0.4)",
  color: active ? "#f6f8ff" : "#c5d2ff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "11px",
  letterSpacing: "0.04em",
  transition: "all 0.2s ease",
});

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  color: "#c0ccff",
  fontSize: "12px",
};

const toggleStyle: React.CSSProperties = {
  appearance: "none",
  width: "40px",
  height: "20px",
  borderRadius: "10px",
  background: "rgba(54, 76, 150, 0.6)",
  position: "relative",
  cursor: "pointer",
  border: "none",
  transition: "background 0.2s ease",
};

const toggleDotStyle = (active: boolean): React.CSSProperties => ({
  position: "absolute",
  top: "2px",
  left: active ? "21px" : "2px",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: active ? "#6ee7ff" : "#a3b6ff",
  transition: "left 0.2s ease",
});

function ToolsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const qualityProfile = useSimulationStore((state) => state.qualityProfile);
  const setQualityProfile = useSimulationStore(
    (state) => state.setQualityProfile,
  );
  const reducedMotion = useSimulationStore((state) => state.reducedMotion);
  const toggleReducedMotion = useSimulationStore(
    (state) => state.toggleReducedMotion,
  );
  const showHud = useSimulationStore((state) => state.showHud);
  const toggleHud = useSimulationStore((state) => state.toggleHud);

  const handleQualityChange = useCallback(
    (profile: QualityProfile) => () => {
      setQualityProfile(profile);
    },
    [setQualityProfile],
  );

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        style={isOpen ? menuButtonHoverStyle : menuButtonStyle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle tools menu"
        title="Tools & Settings"
      >
        🔧
      </button>

      {isOpen && (
        <div style={panelStyle}>
          <div style={titleStyle}>Tools & Settings</div>

          <div style={sectionStyle}>
            <div style={sectionTitleStyle}>Quality</div>
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
          </div>

          <div style={sectionStyle}>
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

          <div style={{ borderTop: "1px solid rgba(115, 147, 255, 0.2)", paddingTop: "12px", marginTop: "12px" }}>
            <div style={toggleRowStyle}>
              <span>Show HUD</span>
              <button
                type="button"
                style={toggleStyle}
                onClick={toggleHud}
                aria-pressed={showHud}
              >
                <span style={toggleDotStyle(showHud)} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ToolsMenu;
