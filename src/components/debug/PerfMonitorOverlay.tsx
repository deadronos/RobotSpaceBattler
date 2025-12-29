import { Html } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { useState } from "react";
// @ts-ignore - types might be missing in some environments
import Draggable from "react-draggable";

/**
 * A draggable performance monitor overlay.
 * Wraps r3f-perf in a draggable container.
 */
export function PerfMonitorOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Html
      transform={false} // 2D overlay, not 3D transform
      zIndexRange={[100, 0]}
      style={{
        width: "100%",
        height: "100%",
        pointerEvents: "none", // Let clicks pass through empty space
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <Draggable
        defaultPosition={{ x: 20, y: 20 }}
        bounds="parent"
        handle=".perf-handle" // Drag by the handle only, or allow full drag
      >
        <div
          style={{
            display: "inline-block",
            pointerEvents: "auto", // Enable interaction for the monitor
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: "4px",
            padding: "4px",
            cursor: "move",
          }}
          className="perf-handle"
        >
          {/*
            Perf naturally portals to the canvas parent.
            We try to override its fixed positioning via style to make it flow in this div.
          */}
          <Perf
            position="top-left"
            minimal={false}
            style={{
              position: "relative",
              top: 0,
              left: 0,
              right: "auto",
              bottom: "auto",
              transform: "none",
            }}
          />
        </div>
      </Draggable>
    </Html>
  );
}