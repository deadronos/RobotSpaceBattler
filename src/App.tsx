import { useEffect } from "react";

import BattleHud from "./components/hud/BattleHud";
import StatusPanel from "./components/hud/StatusPanel";
import TeamOverview from "./components/hud/TeamOverview";
import ToolsMenu from "./components/hud/ToolsMenu";
import Scene from "./components/Scene";
import { useSimulationStore } from "./state/simulationStore";

const containerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gridTemplateRows: "auto 1fr",
  gridTemplateAreas: `
    "status overview"
    "scene overview"
  `,
  width: "100%",
  height: "100%",
};

const sceneWrapperStyle: React.CSSProperties = {
  gridArea: "scene",
  position: "relative",
  overflow: "hidden",
};

const hudOverlayStyle: React.CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "24px",
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
};

const bottomRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
};

const sidebarStyle: React.CSSProperties = {
  gridArea: "overview",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "24px",
  width: "320px",
  background:
    "linear-gradient(180deg, rgba(12, 18, 41, 0.92) 0%, rgba(4, 6, 18, 0.92) 100%)",
  borderLeft: "1px solid rgba(115, 147, 255, 0.25)",
  backdropFilter: "blur(12px)",
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: "14px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7e8cd6",
  marginBottom: "8px",
};

function App() {
  const initialize = useSimulationStore((state) => state.initialize);
  const showHud = useSimulationStore((state) => state.showHud);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div style={containerStyle}>
      <header style={{ gridArea: "status", padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={panelTitleStyle}>Battle Status</div>
          <StatusPanel />
        </div>
        <ToolsMenu />
      </header>

      <section style={sceneWrapperStyle}>
        <Scene />
        <div style={hudOverlayStyle}>
          {showHud && (
            <>
              <div style={topRowStyle}>
                <BattleHud />
              </div>
            </>
          )}
        </div>
      </section>

      <aside style={sidebarStyle}>
        <div>
          <div style={panelTitleStyle}>Team Overview</div>
          <TeamOverview />
        </div>
      </aside>
    </div>
  );
}

export default App;
