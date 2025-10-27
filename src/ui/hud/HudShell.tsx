import type { CSSProperties, ReactNode } from "react";

interface HudShellProps {
  children: ReactNode;
  showHud: boolean;
  topOverlay?: ReactNode;
  bottomOverlay?: ReactNode;
}

const sceneWrapperStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const hudOverlayStyle: CSSProperties = {
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "24px",
};

const topRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  pointerEvents: "auto",
};

const bottomRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  pointerEvents: "auto",
};

function HudShell({
  children,
  showHud,
  topOverlay,
  bottomOverlay,
}: HudShellProps) {
  return (
    <div style={sceneWrapperStyle}>
      {children}
      <div style={hudOverlayStyle}>
        {showHud && (
          <>
            {topOverlay && <div style={topRowStyle}>{topOverlay}</div>}
            {bottomOverlay && <div style={bottomRowStyle}>{bottomOverlay}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default HudShell;
