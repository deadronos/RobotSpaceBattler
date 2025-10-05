import React from "react";

import { useUI } from "../../store/uiStore";

export default function PauseControl() {
  const paused = useUI((s) => s.paused);
  const toggle = useUI((s) => s.togglePaused);
  return (
    <div className="ui panel">
      <button id="pause" onClick={toggle}>
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
