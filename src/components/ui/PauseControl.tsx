import React from "react";

import useUI from "../../store/uiStore";

export default function PauseControl() {
  const paused = useUI((s) => s.paused);
  const togglePause = useUI((s) => s.togglePause);
  return (
    <div className="pause-control">
      <button onClick={togglePause} className="pause-button">
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}
