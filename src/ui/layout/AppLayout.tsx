import type { CSSProperties, ReactNode } from "react";

interface AppLayoutProps {
  header: ReactNode;
  scene: ReactNode;
  sidebar: ReactNode;
}

const containerStyle: CSSProperties = {
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

const headerStyle: CSSProperties = {
  gridArea: "status",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
};

const sceneContainerStyle: CSSProperties = {
  gridArea: "scene",
  display: "flex",
  position: "relative",
  minHeight: 0,
};

const sidebarStyle: CSSProperties = {
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

const panelTitleStyle: CSSProperties = {
  fontSize: "14px",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7e8cd6",
  marginBottom: "8px",
};

export function PanelTitle({ children }: { children: ReactNode }) {
  return <div style={panelTitleStyle}>{children}</div>;
}

function AppLayout({ header, scene, sidebar }: AppLayoutProps) {
  return (
    <div style={containerStyle}>
      <header style={headerStyle}>{header}</header>
      <section style={sceneContainerStyle}>{scene}</section>
      <aside style={sidebarStyle}>{sidebar}</aside>
    </div>
  );
}

export default AppLayout;
